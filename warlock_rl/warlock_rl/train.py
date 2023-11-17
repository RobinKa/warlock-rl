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

from warlock_rl.agent_league import AgentLeague, LeagueAgentExploiter, LeagueAgentMain
from warlock_rl.envs import MAX_ROUNDS, WarlockEnv
from warlock_rl.models import TorchFrameStackingModel

WIN_RATE_THRESHOLD = 0.95
RANDOM_SHOP = True

ModelCatalog.register_custom_model(
    "frame_stack_model",
    TorchFrameStackingModel,
)


class SelfPlayCallback(DefaultCallbacks):
    def on_algorithm_init(self, *, algorithm: Algorithm, **kwargs):
        print("on_algorithm_init")
        self.league = AgentLeague(3, algorithm)

    def on_train_result(self, *, algorithm, result, **kwargs):
        print(f"on_train_result {algorithm.iteration=}")
        for agent in self.league.agents.values():
            if agent.id not in result["sampler_results"]["policy_reward_mean"]:
                print("Skipping", agent)
                continue
            win_rate = (
                result["sampler_results"]["policy_reward_mean"][agent.id] / MAX_ROUNDS
            )
            print(f"[{algorithm.iteration=}, {agent}] training {win_rate=}")

    def on_evaluate_end(
        self, *, algorithm: Algorithm, evaluation_metrics: dict, **kwargs
    ):
        trainable_agents = {k: v for k, v in self.league.agents.items() if v.trainable}

        for agent in trainable_agents.values():
            result = evaluation_metrics["evaluation"]
            win_rate = (
                result["sampler_results"]["policy_reward_mean"][agent.id] / MAX_ROUNDS
            )
            print(
                f"[{algorithm.iteration=}, {agent=}]",
                f"evaluation {win_rate=},",
                "adding clone",
            )
            self.league.add_clone(agent.id)


def policy_mapping_fn(agent_id, episode, worker, **kwargs):
    if isinstance(agent_id, int):
        return "random"
    return "random_shop"


config = (
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
    .callbacks(SelfPlayCallback)
    .rollouts(
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
        gamma=1.0,
        _enable_learner_api=False,
        # clip_param=0.1,
        model={
            # "fcnet_hiddens": [64],
            # "fcnet_hiddens": [128, 128],
            # "fcnet_hiddens": [64],
            # "use_lstm": True,
            # "lstm_cell_size": 64,
            # "max_seq_len": 16,
            "custom_model": "frame_stack_model",
            "custom_model_config": {
                "num_frames": 4,
            },
            # "vf_share_layers": True,
        },
        sgd_minibatch_size=32,
        train_batch_size=44 * 16 * 1,
        num_sgd_iter=4,
        # train_batch_size=32768,
        # sgd_minibatch_size=32768,
        # lr=5e-4,
        # num_sgd_iter=100,
        # lr_schedule=[[0, 8e-5], [20_000, 4e-5], [1_200_000, 3e-5]],
    )
    .evaluation(
        evaluation_interval=100,
        evaluation_duration=50,
    )
    .multi_agent(
        policies={
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
        policies_to_train=[],
    )
    .rl_module(
        _enable_rl_module_api=False,
        rl_module_spec=MultiAgentRLModuleSpec(
            module_specs={
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
    # .callbacks(SelfPlayCallback)
    .environment(
        env=WarlockEnv,
        disable_env_checking=True,  # fails with multiagent
    )
)

# algo = Algorithm.from_checkpoint("/tmp/tmpy010_u6o")

callbacks = []
# if wandb_api_key := os.environ.get("WANDB_API_KEY"):
#     callbacks.append(
#         WandbLoggerCallback(
#             api_key=wandb_api_key,
#             project="warlock-rl",
#             log_config=True,
#         )
#     )

results = tune.Tuner(
    "PPO",
    param_space=config,
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
