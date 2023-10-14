from ray.rllib.algorithms.ppo import PPOConfig
from ray.tune.logger import pretty_print

from warlock_rl.envs import WarlockEnv

algo = (
    PPOConfig()
    .rollouts(num_rollout_workers=4, num_envs_per_worker=16)
    .resources(num_gpus=1)
    .environment(env=WarlockEnv)
    .build()
)

i = 0
while True:
    result = algo.train()
    print(pretty_print(result))

    if i % 5 == 0:
        checkpoint_dir = algo.save().checkpoint.path
        print(f"Checkpoint saved in directory {checkpoint_dir}")
    i += 1
