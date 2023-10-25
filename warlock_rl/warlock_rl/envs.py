from typing import Any, Sequence, SupportsFloat

import gymnasium as gym
import numpy as np
from ray.rllib.env.multi_agent_env import MultiAgentEnv

from warlock_rl.game import Game

OBS_LOC_SCALE = 2_000
MAX_TIME = 180

index_to_entity_id = {
    0: "1000",
    1: "1001",
}


# TODO: make work for arbitrary number of players
def state_to_obs(
    state: dict, self_player_index: int, other_player_index: int
) -> np.ndarray:
    self_entity_id = index_to_entity_id[self_player_index]
    other_entity_id = index_to_entity_id[other_player_index]

    def get_ability_relative_cooldown(entity_id: str, ability_id: str) -> float:
        ability = state["abilities"][entity_id][ability_id]
        if "lastUsedFrame" not in ability:
            return 0.0
        cooldown = max(
            0.0,
            ability["lastUsedFrame"] * state["gameState"]["deltaTime"]
            + ability["cooldown"]
            - state["gameState"]["frameNumber"] * state["gameState"]["deltaTime"],
        )
        return cooldown / ability["cooldown"]

    def get_player_observations(entity_id: str) -> list[float]:
        health = state["healths"][entity_id]["current"]
        x = state["bodies"][entity_id]["location"]["e1"]
        y = state["bodies"][entity_id]["location"]["e2"]
        facing_x = np.cos(state["bodies"][entity_id]["facing"])
        facing_y = np.sin(state["bodies"][entity_id]["facing"])
        casting = 1 if state["units"][entity_id]["state"]["type"] == "casting" else 0
        moving = 1 if state["units"][entity_id]["state"]["type"] == "moving" else 0
        ability_cooldowns = [
            get_ability_relative_cooldown(entity_id, ability_id)
            for ability_id in ["shoot", "scourge", "teleport", "homing", "shield"]
        ]

        return [
            health / 100,
            x / OBS_LOC_SCALE + 0.5,
            y / OBS_LOC_SCALE + 0.5,
            facing_x * 0.5 + 0.5,
            facing_y * 0.5 + 0.5,
            casting,
            moving,
            *ability_cooldowns,
        ]

    def get_projectile_observations(entity_id: str) -> list[float]:
        x = state["bodies"][entity_id]["location"]["e1"]
        y = state["bodies"][entity_id]["location"]["e2"]
        is_enemy = (
            state["playerOwneds"][entity_id]["owningPlayerId"]
            != state["playerOwneds"][self_entity_id]["owningPlayerId"]
        )
        return [
            x / OBS_LOC_SCALE + 0.5,
            y / OBS_LOC_SCALE + 0.5,
            1 if is_enemy else 0,
        ]

    def distance_squared_to_self(location: dict[str, float]) -> float:
        dx = location["e1"] - state["bodies"][self_entity_id]["location"]["e1"]
        dy = location["e2"] - state["bodies"][self_entity_id]["location"]["e2"]
        return dx * dx + dy * dy

    sorted_projectiles = sorted(
        state["projectiles"].items(),
        key=lambda x: distance_squared_to_self(state["bodies"][x[0]]["location"]),
    )

    projectile_obs = [[0.5, 0.5, 0.5] for _ in range(3)]
    for i, (projectile_id, _) in enumerate(sorted_projectiles[: len(projectile_obs)]):
        projectile_obs[i] = get_projectile_observations(projectile_id)

    elapsed_time = state["gameState"]["deltaTime"] * state["gameState"]["frameNumber"]

    observations = (
        [
            elapsed_time / MAX_TIME,
        ]
        + get_player_observations(self_entity_id)
        + get_player_observations(other_entity_id)
        + projectile_obs[0]
        + projectile_obs[1]
        + projectile_obs[2]
    )

    obs = np.clip(
        np.array(
            observations,
            np.float32,
        ),
        0,
        1,
        dtype=np.float32,
    )

    assert obs.shape == (1 + 2 * 12 + 3 * 3,), obs
    assert all(0 <= o <= 1 for o in obs), obs

    return obs


def calculate_reward(old_state, new_state, self_player_index, other_player_index):
    self_entity_id = index_to_entity_id[self_player_index]
    other_entity_id = index_to_entity_id[other_player_index]
    reward = (
        (
            old_state["healths"][other_entity_id]["current"]
            - new_state["healths"][other_entity_id]["current"]
        )
        + (
            new_state["healths"][self_entity_id]["current"]
            - old_state["healths"][self_entity_id]["current"]
        )
    ) / 100

    # Reward for teleporting on platform.
    # Negative for self to avoid non-zero-sum reward.
    # TODO: Anneal this down?

    def teleport_reward(entity_id: str):
        if any(
            event["type"] == "abilityUsed"
            and event["entityId"] == entity_id
            and event["abilityId"] == "teleport"
            for event in new_state["gameEvents"]["events"]
        ):
            distance_to_center_sq = (
                new_state["bodies"][entity_id]["location"]["e1"] ** 2
                + new_state["bodies"][entity_id]["location"]["e2"] ** 2
            )
            arena_radius_sq = new_state["arena"]["radius"] ** 2
            if distance_to_center_sq <= arena_radius_sq:
                return 0.2
        return 0.0

    # reward += teleport_reward(self_entity_id)
    # reward -= teleport_reward(other_entity_id)

    return reward


def action_to_order(
    player_index: int, state: dict, action: Sequence[float]
) -> dict | None:
    # Target location
    target = {
        "e1": OBS_LOC_SCALE * (action[0] - 0.5),
        "e2": OBS_LOC_SCALE * (action[1] - 0.5),
    }

    # Add enemy location to target.
    # Also make the offset much smaller.
    is_target_offset_from_enemy = action[2] >= 0.5
    if is_target_offset_from_enemy:
        enemy_index = 1 - player_index  # TODO
        enemy_entity_id = index_to_entity_id[enemy_index]
        enemy_location = state["bodies"][enemy_entity_id]["location"]
        target["e1"] * 0.2
        target["e2"] * 0.2
        target["e1"] += enemy_location["e1"]
        target["e2"] += enemy_location["e2"]

    # Chosen action
    action_type = np.argmax(action[3:])

    match action_type:
        case 0:
            return None
        case 1:
            return {
                "type": "stop",
            }
        case 2:
            return {
                "type": "move",
                "target": target,
            }
        case 3:
            return {
                "type": "useAbility",
                "abilityId": "shoot",
                "target": target,
            }
        case 4:
            target["e1"] *= 0.25
            target["e2"] *= 0.25
            return {
                "type": "useAbility",
                "abilityId": "teleport",
                "target": target,
            }
        case 5:
            return {
                "type": "useAbility",
                "abilityId": "scourge",
            }
        case 6:
            return {
                "type": "useAbility",
                "abilityId": "homing",
                "target": target,
            }
        case 7:
            return {
                "type": "useAbility",
                "abilityId": "shield",
            }

    raise ValueError(f"Unhandled action {action=} {action_type=}")


class WarlockEnv(MultiAgentEnv):
    _game: Game | None = None

    def __init__(self, *args, num_players: int = 2, **kwargs) -> None:
        assert num_players == 2  # TODO: support different number of players

        self._num_players = num_players
        # Actions:
        # 0: x
        # 1: y
        # 2: Is x,y offset from enemy?
        # 3: Nothing
        # 4: Stop
        # 5: Move
        # 6: Shoot
        # 7: Teleport
        # 8: Scourge
        # 9: Homing
        # 10: Shield
        self.action_space = gym.spaces.Box(0, 1, (11,))

        # Observations
        self.observation_space = gym.spaces.Box(0, 1, (1 + 2 * 12 + 3 * 3,))

        self._agent_ids = set(range(num_players))

        self._game = Game()

        super().__init__()

    @property
    def num_players(self):
        return self._num_players

    def _make_obs(self):
        return {
            i: state_to_obs(self._game.state, i, 1 - i) for i in range(self.num_players)
        }

    def reset(
        self, *, seed: int | None = None, options: dict[str, Any] | None = None
    ) -> dict[str, np.ndarray]:
        super().reset(seed=seed, options=options)

        if self._game.started:
            self._game.log_game()

        self._game.start(num_players=self.num_players, seed=seed)

        return self._make_obs(), {}

    def _constant_agent_dict(self, constant, with_all: bool) -> dict:
        d = {i: constant for i in range(self.num_players)}
        if with_all:
            d["__all__"] = constant
        return d

    def step(
        self, actions: dict[int, Sequence[float]]
    ) -> tuple[Any, SupportsFloat, bool, bool, dict[str, Any]]:
        # assert set(actions.keys()) == {0, 1}, actions
        # assert len(actions[0]) == self.action_space.shape[0], actions
        # assert len(actions[1]) == self.action_space.shape[0], actions

        old_state = self._game.state

        # Set player orders
        # TODO: Do this in one batch call
        for player_index, action in actions.items():
            order = action_to_order(
                player_index=player_index, state=self._game.state, action=action
            )
            if order is not None:
                self._game.order(
                    entity_id=index_to_entity_id[player_index], order=order
                )

        # Advance the game, check for termination on every frame
        for _ in range(6):
            self._game.step(steps=1)
            new_state = self._game.state

            terminated = (
                new_state["gameState"]["deltaTime"]
                * new_state["gameState"]["frameNumber"]
                >= MAX_TIME
                or new_state["healths"]["1000"]["current"] == 0
                or new_state["healths"]["1001"]["current"] == 0
            )

            if terminated:
                break

        return (
            self._make_obs(),
            # {
            #     i: calculate_reward(
            #         old_state=old_state,
            #         new_state=new_state,
            #         self_player_index=i,
            #         other_player_index=1 - i,
            #     )
            #     for i in range(self.num_players)
            # },
            {
                i: 1
                if terminated and new_state["healths"][index_to_entity_id[1 - i]]["current"] == 0
                else 0
                for i in range(self.num_players)
            },
            self._constant_agent_dict(terminated, True),
            self._constant_agent_dict(False, True),
            {},
        )
