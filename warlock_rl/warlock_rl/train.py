import os

import numpy as np
from ray import air, tune
from ray.air.integrations.wandb import WandbLoggerCallback
from ray.rllib.algorithms.algorithm import Algorithm
from ray.rllib.algorithms.callbacks import DefaultCallbacks
from ray.rllib.algorithms.ppo import PPOConfig
from ray.rllib.core.rl_module.marl_module import MultiAgentRLModuleSpec
from ray.rllib.core.rl_module.rl_module import SingleAgentRLModuleSpec
from ray.rllib.examples.policy.random_policy import RandomPolicy
from ray.rllib.examples.rl_module.random_rl_module import RandomRLModule
from ray.rllib.models.catalog import ModelCatalog
from ray.rllib.policy.policy import PolicySpec
from ray.tune import CLIReporter

from warlock_rl.envs import MAX_ROUNDS, WarlockEnv
from warlock_rl.models import TorchFrameStackingModel

WIN_RATE_THRESHOLD = 0.9

ModelCatalog.register_custom_model(
    "frame_stack_model",
    TorchFrameStackingModel,
)


class SelfPlayCallback(DefaultCallbacks):
    def __init__(self):
        super().__init__()
        # 0=RandomPolicy, 1=1st main policy snapshot,
        # 2=2nd main policy snapshot, etc..
        self.current_opponent = 0
        self.last_changed_iter = 0

    def on_train_result(self, *, algorithm, result, **kwargs):
        result["league_size"] = self.current_opponent + 2

        win_rate = (
            result["sampler_results"]["policy_reward_mean"].get("main", -1) / MAX_ROUNDS
        )
        result["win_rate"] = win_rate
        print(f"Iter={algorithm.iteration} win-rate={win_rate}")

    def on_evaluate_end(
        self, *, algorithm: Algorithm, evaluation_metrics: dict, **kwargs
    ):
        result = evaluation_metrics["evaluation"]
        win_rate = result["sampler_results"]["policy_reward_mean"]["main"] / MAX_ROUNDS
        print(f"Evaluation Iter={algorithm.iteration} win-rate={win_rate} -> ", end="")

        # If win rate is good -> Snapshot current policy and play against
        # it next, keeping the snapshot fixed and only improving the "main"
        # policy.
        if win_rate >= WIN_RATE_THRESHOLD and (
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
                if isinstance(agent_id, int):
                    return (
                        "main"
                        if agent_id == 0
                        else "main_v{}".format(
                            np.random.choice(list(range(1, self.current_opponent + 1)))
                        )
                    )
                return (
                    "main_shop"
                    if agent_id == "shop_0"
                    else "main_v{}_shop".format(
                        np.random.choice(list(range(1, self.current_opponent + 1)))
                    )
                )

            main_policy = algorithm.get_policy("main")
            main_shop_policy = algorithm.get_policy("main_shop")
            if algorithm.config._enable_learner_api:
                new_policy = algorithm.add_policy(
                    policy_id=new_pol_id,
                    policy_cls=type(main_policy),
                    policy_mapping_fn=policy_mapping_fn,
                    module_spec=SingleAgentRLModuleSpec.from_module(main_policy.model),
                    action_space=WarlockEnv.round_action_space,
                    observation_space=WarlockEnv.round_observation_space,
                )
                new_shop_policy = algorithm.add_policy(
                    policy_id=new_pol_id + "_shop",
                    policy_cls=type(main_shop_policy),
                    policy_mapping_fn=policy_mapping_fn,
                    module_spec=SingleAgentRLModuleSpec.from_module(
                        main_shop_policy.model
                    ),
                    action_space=WarlockEnv.shop_action_space,
                    observation_space=WarlockEnv.shop_observation_space,
                )
            else:
                new_policy = algorithm.add_policy(
                    policy_id=new_pol_id,
                    policy_cls=type(main_policy),
                    policy_mapping_fn=policy_mapping_fn,
                    action_space=WarlockEnv.round_action_space,
                    observation_space=WarlockEnv.round_observation_space,
                )
                new_shop_policy = algorithm.add_policy(
                    policy_id=new_pol_id + "_shop",
                    policy_cls=type(main_shop_policy),
                    policy_mapping_fn=policy_mapping_fn,
                    action_space=WarlockEnv.shop_action_space,
                    observation_space=WarlockEnv.shop_observation_space,
                )

            # Set the weights of the new policy to the main policy.
            # We'll keep training the main policy, whereas `new_pol_id` will
            # remain fixed.
            main_state = main_policy.get_state()
            new_policy.set_state(main_state)
            main_shop_state = main_shop_policy.get_state()
            new_shop_policy.set_state(main_shop_state)
            # We need to sync the just copied local weights (from main policy)
            # to all the remote workers as well.
            print("good enough; updating model ...")
            algorithm.workers.sync_weights(timeout_seconds=10)
            algorithm.evaluation_workers.sync_weights(timeout_seconds=10)
            print("updated!")
        else:
            print("not good enough; will keep learning ...")


def policy_mapping_fn(agent_id, episode, worker, **kwargs):
    if isinstance(agent_id, int):
        return "main" if agent_id == 0 else "random"
    return "main_shop" if agent_id == "shop_0" else "random_shop"


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
        # num_rollout_workers=32,
        num_rollout_workers=16,
        num_envs_per_worker=1,
        # rollout_fragment_length=512,
        rollout_fragment_length=44,
    )
    .resources(
        # num_gpus=1,
        # num_gpus_per_learner_worker=1,
        # num_gpus_per_worker=0.03,
        num_cpus_per_worker=0.9,
    )
    .training(
        _enable_learner_api=False,
        # clip_param=0.1,
        model={
            "fcnet_hiddens": [64],
            # "fcnet_hiddens": [128, 128],
            # "fcnet_hiddens": [64],
            # "use_lstm": True,
            # "lstm_cell_size": 64,
            # "max_seq_len": 16,
            "custom_model": "frame_stack_model",
            "custom_model_config": {
                "num_frames": 4,
            },
            "vf_share_layers": True,
        },
        # train_batch_size=3200,
        # sgd_minibatch_size=64,
        sgd_minibatch_size=64,
        train_batch_size=44 * 8 * 2,
        # train_batch_size=8192,
        # sgd_minibatch_size=8192,
        # lr=5e-5,
        num_sgd_iter=4,
        # lr_schedule=[[0, 8e-5], [20_000, 4e-5], [1_200_000, 3e-5]],
    )
    .evaluation(
        evaluation_interval=100,
        evaluation_duration=10,
        # evaluation_parallel_to_training=True,
        # evaluation_num_workers=4,
    )
    .multi_agent(
        policies={
            "main": PolicySpec(
                action_space=WarlockEnv.round_action_space,
                observation_space=WarlockEnv.round_observation_space,
            ),
            "main_shop": PolicySpec(
                action_space=WarlockEnv.shop_action_space,
                observation_space=WarlockEnv.shop_observation_space,
            ),
            "random": PolicySpec(
                policy_class=RandomPolicy,
                action_space=WarlockEnv.round_action_space,
                observation_space=WarlockEnv.round_observation_space,
            ),
            "random_shop": PolicySpec(
                policy_class=RandomPolicy,
                action_space=WarlockEnv.shop_action_space,
                observation_space=WarlockEnv.shop_observation_space,
            ),
        },
        policy_mapping_fn=policy_mapping_fn,
        policies_to_train=["main", "main_shop"],
    )
    .rl_module(
        _enable_rl_module_api=False,
        rl_module_spec=MultiAgentRLModuleSpec(
            module_specs={
                "main": SingleAgentRLModuleSpec(
                    action_space=WarlockEnv.round_action_space,
                    observation_space=WarlockEnv.round_observation_space,
                ),
                "main_shop": SingleAgentRLModuleSpec(
                    action_space=WarlockEnv.shop_action_space,
                    observation_space=WarlockEnv.shop_observation_space,
                ),
                "random": SingleAgentRLModuleSpec(
                    module_class=RandomRLModule,
                    action_space=WarlockEnv.round_action_space,
                    observation_space=WarlockEnv.round_observation_space,
                ),
                "random_shop": SingleAgentRLModuleSpec(
                    module_class=RandomRLModule,
                    action_space=WarlockEnv.shop_action_space,
                    observation_space=WarlockEnv.shop_observation_space,
                ),
            }
        ),
    )
    .callbacks(SelfPlayCallback)
    .environment(
        env=WarlockEnv,
        disable_env_checking=True,  # fails with multiagent
    )
)

# algo = Algorithm.from_checkpoint("/tmp/tmpy010_u6o")

callbacks = []
if wandb_api_key := os.environ.get("WANDB_API_KEY"):
    callbacks.append(
        WandbLoggerCallback(
            api_key=wandb_api_key,
            project="warlock-rl",
            log_config=True,
        )
    )

results = tune.Tuner(
    "PPO",
    param_space=algo,
    run_config=air.RunConfig(
        # stop=stop,
        callbacks=callbacks,
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
