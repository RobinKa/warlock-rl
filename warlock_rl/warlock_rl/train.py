from ray.rllib.algorithms.ppo import PPOConfig
from ray.rllib.algorithms.algorithm import Algorithm
from ray.tune.logger import pretty_print

from warlock_rl.envs import WarlockEnv

algo = (
    PPOConfig()
    .rollouts(
        num_rollout_workers=24, num_envs_per_worker=2, batch_mode="complete_episodes"
    )
    .resources(num_gpus=1, num_cpus_per_worker=0.65)
    .training(
        model={
            "fcnet_hiddens": [64, 64],
        },
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
