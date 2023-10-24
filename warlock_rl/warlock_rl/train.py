import numpy as np
from ray import air, tune
from ray.rllib.algorithms.callbacks import DefaultCallbacks
from ray.rllib.algorithms.ppo import PPOConfig
from ray.rllib.core.rl_module.marl_module import MultiAgentRLModuleSpec
from ray.rllib.core.rl_module.rl_module import SingleAgentRLModuleSpec
from ray.rllib.examples.policy.random_policy import RandomPolicy
from ray.rllib.examples.rl_module.random_rl_module import RandomRLModule
from ray.rllib.policy.policy import PolicySpec
from ray.tune import CLIReporter

from warlock_rl.envs import WarlockEnv

WIN_RATE_THRESHOLD = 0.9


class SelfPlayCallback(DefaultCallbacks):
    def __init__(self):
        super().__init__()
        # 0=RandomPolicy, 1=1st main policy snapshot,
        # 2=2nd main policy snapshot, etc..
        self.current_opponent = 0
        self.last_changed_iter = None

    def on_train_result(self, *, algorithm, result, **kwargs):
        # Get the win rate for the train batch.
        # Note that normally, one should set up a proper evaluation config,
        # such that evaluation always happens on the already updated policy,
        # instead of on the already used train_batch.
        main_rew = result["hist_stats"].pop("policy_main_reward")
        opponent_rew = list(result["hist_stats"].values())[0]
        assert len(main_rew) == len(opponent_rew)
        won = 0
        for r_main, r_opponent in zip(main_rew, opponent_rew):
            if r_main > r_opponent:
                won += 1
        win_rate = won / len(main_rew)
        result["win_rate"] = win_rate
        print(f"Iter={algorithm.iteration} win-rate={win_rate} -> ", end="")
        # If win rate is good -> Snapshot current policy and play against
        # it next, keeping the snapshot fixed and only improving the "main"
        # policy.
        if win_rate > WIN_RATE_THRESHOLD and (
            self.last_changed_iter is None
            or algorithm.iteration > self.last_changed_iter + 5
        ):
            self.last_changed_iter = algorithm.iteration
            self.current_opponent += 1
            new_pol_id = f"main_v{self.current_opponent}"
            print(f"adding new opponent to the mix ({new_pol_id}).")

            # Re-define the mapping function, such that "main" is forced
            # to play against any of the previously played policies
            # (excluding "random").
            def policy_mapping_fn(agent_id, episode, worker, **kwargs):
                # agent_id = [0|1] -> policy depends on episode ID
                # This way, we make sure that both policies sometimes play
                # (start player) and sometimes agent1 (player to move 2nd).
                return (
                    "main"
                    if agent_id == 0
                    else "main_v{}".format(
                        np.random.choice(list(range(1, self.current_opponent + 1)))
                    )
                )

            main_policy = algorithm.get_policy("main")
            if algorithm.config._enable_learner_api:
                new_policy = algorithm.add_policy(
                    policy_id=new_pol_id,
                    policy_cls=type(main_policy),
                    policy_mapping_fn=policy_mapping_fn,
                    module_spec=SingleAgentRLModuleSpec.from_module(main_policy.model),
                )
            else:
                new_policy = algorithm.add_policy(
                    policy_id=new_pol_id,
                    policy_cls=type(main_policy),
                    policy_mapping_fn=policy_mapping_fn,
                )

            # Set the weights of the new policy to the main policy.
            # We'll keep training the main policy, whereas `new_pol_id` will
            # remain fixed.
            main_state = main_policy.get_state()
            new_policy.set_state(main_state)
            # We need to sync the just copied local weights (from main policy)
            # to all the remote workers as well.
            algorithm.workers.sync_weights()
        else:
            print("not good enough; will keep learning ...")

        # +2 = main + random
        result["league_size"] = self.current_opponent + 2


def policy_mapping_fn(agent_id, episode, worker, **kwargs):
    return "main" if agent_id == 0 else "random"


algo = (
    PPOConfig()
    # .framework(
    #     "torch",
    #     torch_compile_worker=True,
    #     torch_compile_worker_dynamo_backend="inductor",
    #     torch_compile_worker_dynamo_mode="default",
    #     torch_compile_learner=True,
    #     torch_compile_learner_dynamo_backend="inductor",
    #     torch_compile_learner_dynamo_mode="default",
    # )
    .rollouts(
        num_rollout_workers=32,
        num_envs_per_worker=2,
        # rollout_fragment_length=512,
        rollout_fragment_length=100,
    )
    .resources(
        # num_gpus=1,
        # num_gpus_per_learner_worker=1,
        # num_gpus_per_worker=0.03,
        num_cpus_per_worker=0.95,
    )
    .training(
        # _enable_learner_api=False,
        clip_param=0.2,
        model={
            "fcnet_hiddens": [64],
            # "fcnet_hiddens": [],
            # "use_lstm": True,
            # "lstm_cell_size": 64,
            # "max_seq_len": 16,
        },
        # train_batch_size=3200,
        # sgd_minibatch_size=64,
        train_batch_size=6400,
        # train_batch_size=32768,
        # sgd_minibatch_size=1024,
        # num_sgd_iter=30,
        # lr_schedule=[[0, 8e-5], [20_000, 4e-5], [1_200_000, 3e-5]],
    )
    .multi_agent(
        policies={
            "main": PolicySpec(),
            "random": PolicySpec(policy_class=RandomPolicy),
        },
        policy_mapping_fn=policy_mapping_fn,
        policies_to_train=["main"],
    )
    .rl_module(
        # _enable_rl_module_api=False,
        rl_module_spec=MultiAgentRLModuleSpec(
            module_specs={
                "main": SingleAgentRLModuleSpec(),
                "random": SingleAgentRLModuleSpec(module_class=RandomRLModule),
            }
        ),
    )
    .callbacks(SelfPlayCallback)
    .environment(env=WarlockEnv)
    # .build()
)

# algo = Algorithm.from_checkpoint("/tmp/tmpy010_u6o")

# i = 0
# while True:
#     result = algo.train()
#     print(pretty_print(result))

#     if i % 5 == 0:
#         checkpoint_dir = algo.save().checkpoint.path
#         print(f"Checkpoint saved in directory {checkpoint_dir}")
#     i += 1

results = tune.Tuner(
    "PPO",
    param_space=algo,
    run_config=air.RunConfig(
        # stop=stop,
        verbose=2,
        failure_config=air.FailureConfig(fail_fast="raise"),
        progress_reporter=CLIReporter(
            metric_columns={
                "training_iteration": "iter",
                "time_total_s": "time_total_s",
                "timesteps_total": "ts",
                "episodes_this_iter": "train_episodes",
                "policy_reward_mean/main": "reward",
                "ray/tune/win_rate": "win_rate",
                "ray/tune/league_size": "league_size",
            },
            sort_by_metric=True,
        ),
        # checkpoint_config=air.CheckpointConfig(
        #     checkpoint_at_end=create_checkpoints,
        #     checkpoint_frequency=10 if create_checkpoints else 0,
        # ),
    ),
).fit()
