from ray.rllib.algorithms.ppo import PPOConfig
from ray.rllib.core.rl_module.marl_module import MultiAgentRLModuleSpec
from ray.rllib.core.rl_module.rl_module import SingleAgentRLModuleSpec
from ray.rllib.examples.policy.random_policy import RandomPolicy
from ray.rllib.examples.rl_module.random_rl_module import RandomRLModule
from ray.rllib.policy.policy import PolicySpec

# from ray.rllib.algorithms.algorithm import Algorithm
from ray.tune.logger import pretty_print

from warlock_rl.envs import WarlockEnv


def policy_mapping_fn(agent_id, episode, worker, **kwargs):
    return agent_id


algo = (
    PPOConfig()
    .rollouts(
        num_rollout_workers=32,
        num_envs_per_worker=2,
        rollout_fragment_length=100,
        # rollout_fragment_length=100,  # batch_mode="complete_episodes",
    )
    .resources(
        num_gpus=1,
        num_cpus_per_worker=1,
        # num_cpus_per_worker=0.5,
        # local_gpu_idx=0,
        # num_gpus_per_learner_worker=1,
    )
    .training(
        model={
            "fcnet_hiddens": [64, 64],
        },
        train_batch_size=6400,
    )
    .multi_agent(
        policies={
            "player_0": PolicySpec(),
            "player_1": PolicySpec(),
        },
        policy_mapping_fn=policy_mapping_fn,
        # policies_to_train=["player_1"],
    )
    .rl_module(
        rl_module_spec=MultiAgentRLModuleSpec(
            module_specs={
                "player_0": SingleAgentRLModuleSpec(),
                "player_1": SingleAgentRLModuleSpec(),
            }
        ),
    )
    .environment(env=WarlockEnv)
    .build()
)

# algo = Algorithm.from_checkpoint("/tmp/tmpy010_u6o")

i = 0
while True:
    result = algo.train()
    print(pretty_print(result))

    if i % 5 == 0:
        checkpoint_dir = algo.save().checkpoint.path
        print(f"Checkpoint saved in directory {checkpoint_dir}")
    i += 1
