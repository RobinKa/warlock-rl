from dataclasses import dataclass

import numpy as np
from ray.rllib.algorithms import Algorithm
from ray.rllib.core.rl_module.rl_module import SingleAgentRLModuleSpec
from ray.rllib.evaluation.rollout_worker import RolloutWorker
from ray.rllib.policy import Policy
from ray.rllib.policy.policy import PolicySpec

from warlock_rl.envs import WarlockEnv


@dataclass
class LeagueAgent:
    id: str


@dataclass
class LeagueAgentMain(LeagueAgent):
    trainable = True


@dataclass
class LeagueAgentClone(LeagueAgent):
    parent_id: str
    trainable = False


@dataclass
class LeagueAgentExploiter(LeagueAgent):
    target_id: str
    trainable = True


class AgentLeague:
    def __init__(self, num_main: int, algorithm: Algorithm):
        self._algorithm = algorithm
        self._next_policy_id = str(0)

        self._agents: dict[str, LeagueAgent] = {}

        for _ in range(num_main):
            main_id = self.add_main()
            self.add_exploiter(main_id)

    @property
    def agents(self):
        return self._agents

    def _get_next_policy_id(self):
        next_id = self._next_policy_id
        self._next_policy_id = str(int(next_id) + 1)
        return next_id

    def add_main(self) -> str:
        # Add main
        main_policy_id = self._get_next_policy_id()

        main_policy = self._algorithm.add_policy(
            policy_id=main_policy_id,
            policy_cls=self._algorithm.get_default_policy_class(
                self._algorithm.get_config()
            ),
            action_space=WarlockEnv.round_action_space,
            observation_space=WarlockEnv.round_observation_space,
        )

        self._agents[main_policy_id] = LeagueAgentMain(
            id=main_policy_id,
        )

        self._sync()

        return main_policy_id

    def add_exploiter(self, agent_id: str) -> str:
        # Add exploiter
        exploiter_policy_id = self._get_next_policy_id()

        exploiter_policy = self._algorithm.add_policy(
            policy_id=exploiter_policy_id,
            policy_cls=self._algorithm.get_default_policy_class(
                self._algorithm.get_config()
            ),
            action_space=WarlockEnv.round_action_space,
            observation_space=WarlockEnv.round_observation_space,
        )
        self._agents[exploiter_policy_id] = LeagueAgentExploiter(
            id=exploiter_policy_id,
            target_id=agent_id,
        )

        self._sync()

        return exploiter_policy_id

    def add_clone(self, agent_id: str) -> str:
        policy_id = self._get_next_policy_id()

        policy = self._algorithm.add_policy(
            policy_id=policy_id,
            policy_cls=self._algorithm.get_default_policy_class(
                self._algorithm.get_config()
            ),
            action_space=WarlockEnv.round_action_space,
            observation_space=WarlockEnv.round_observation_space,
        )
        self._agents[policy_id] = LeagueAgentClone(
            id=policy_id,
            parent_id=agent_id,
        )
        policy.set_state(
            self._algorithm.get_policy(self._agents[agent_id].id).get_state()
        )

        self._sync()

        return policy_id

    def _sync(self):
        self._algorithm.workers.sync_weights(timeout_seconds=10)
        self._algorithm.evaluation_workers.sync_weights(timeout_seconds=10)

        policy_mapping_fn = self.get_policy_mapping_fn()
        policies_to_train = [i for i, agent in self._agents.items() if agent.trainable]

        def update_worker(worker: RolloutWorker):
            worker.set_policy_mapping_fn(policy_mapping_fn)
            worker.set_is_policy_to_train(policies_to_train)

        self._algorithm.workers.foreach_worker(update_worker)
        self._algorithm.evaluation_workers.foreach_worker(update_worker)

    def get_policy_mapping_fn(self):
        agents = self._agents

        def policy_mapping_fn(agent_id, episode, worker, **kwargs):
            if isinstance(agent_id, str):
                return "random_shop"
            rng = np.random.default_rng(seed=episode.episode_id)
            trainable_id, trainable_agent = rng.choice(
                [(i, agent) for i, agent in agents.items() if agent.trainable]
            )

            # The first agent is always the trainable one
            if agent_id == 0:
                return trainable_id

            rng = np.random.default_rng(seed=(episode.episode_id, agent_id))

            if isinstance(trainable_agent, LeagueAgentMain):
                # Play against any frozen or main agent
                choices = [
                    i
                    for i, agent in agents.items()
                    if isinstance(agent, LeagueAgentClone)
                    or isinstance(agent, LeagueAgentMain)
                ]
                if not choices:
                    return "random"
                return rng.choice(choices)
            elif isinstance(trainable_agent, LeagueAgentExploiter):
                # Play against any non-frozen main agent of the target id
                return rng.choice(
                    [
                        i
                        for i, agent in agents.items()
                        if (
                            isinstance(agent, LeagueAgentMain)
                            and agent.id == trainable_agent.target_id
                        )
                    ]
                )

            raise NotImplementedError()

        return policy_mapping_fn
