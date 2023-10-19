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


# TODO: make work for arbitraryn umber of players
def state_to_obs(
    state: dict, self_player_index: int, other_player_index: int
) -> np.ndarray:
    self_entity_id = index_to_entity_id[self_player_index]
    other_entity_id = index_to_entity_id[other_player_index]

    self_health = state["healths"][self_entity_id]["current"]
    other_health = state["healths"][other_entity_id]["current"]
    self_x = state["bodies"][self_entity_id]["location"]["e1"]
    self_y = state["bodies"][self_entity_id]["location"]["e2"]
    self_facing_x = np.cos(state["bodies"][self_entity_id]["facing"])
    self_facing_y = np.sin(state["bodies"][self_entity_id]["facing"])
    other_x = state["bodies"][other_entity_id]["location"]["e1"]
    other_y = state["bodies"][other_entity_id]["location"]["e2"]
    other_facing_x = np.cos(state["bodies"][other_entity_id]["facing"])
    other_facing_y = np.sin(state["bodies"][other_entity_id]["facing"])
    elapsed_time = state["gameState"]["deltaTime"] * state["gameState"]["frameNumber"]

    return np.clip(
        np.array(
            [
                self_health / 100,
                other_health / 100,
                self_x / OBS_LOC_SCALE + 0.5,
                self_y / OBS_LOC_SCALE + 0.5,
                self_facing_x * 0.5 + 0.5,
                self_facing_y * 0.5 + 0.5,
                other_x / OBS_LOC_SCALE + 0.5,
                other_y / OBS_LOC_SCALE + 0.5,
                other_facing_x * 0.5 + 0.5,
                other_facing_y * 0.5 + 0.5,
                elapsed_time / MAX_TIME,
            ],
            np.float32,
        ),
        0,
        1,
    )


def calculate_reward(old_state, new_state, self_player_index, other_player_index):
    self_entity_id = index_to_entity_id[self_player_index]
    other_entity_id = index_to_entity_id[other_player_index]
    return (
        (
            old_state["healths"][other_entity_id]["current"]
            - new_state["healths"][other_entity_id]["current"]
        )
        + (
            new_state["healths"][self_entity_id]["current"]
            - old_state["healths"][self_entity_id]["current"]
        )
    ) / 100  # - 0.01


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
                "type": "move",
                "target": target,
            }
        case 2:
            return {
                "type": "useAbility",
                "abilityId": "shoot",
                "target": target,
            }
        case 3:
            return {
                "type": "useAbility",
                "abilityId": "teleport",
                "target": target,
            }
        case 4:
            return {
                "type": "useAbility",
                "abilityId": "scourge",
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
        # 4: Move
        # 5: Shoot
        # 6: Teleport
        # 7: Scourge
        self.action_space = gym.spaces.Box(0, 1, (8,))

        # Observations:
        # 0: Self health
        # 1: Other health
        # 2: Self x
        # 3: Self y
        # 4: Self facing x
        # 5: Self facing y
        # 6: Other x
        # 7: Other y
        # 8: Other facing x
        # 9: Other facing y
        # 10: Time
        self.observation_space = gym.spaces.Box(0, 1, (11,))

        self._agent_ids = {self.player_index_to_name(i) for i in range(num_players)}

        self._game = Game()

    @property
    def num_players(self):
        return self._num_players

    @classmethod
    def player_index_to_name(cls, player_index: int) -> str:
        return f"player_{player_index}"

    @classmethod
    def player_name_to_index(cls, player_name: str) -> str:
        return int(player_name[len("player_") :])

    def _make_obs(self):
        return {
            self.player_index_to_name(i): state_to_obs(self._game.state, i, 1 - i)
            for i in range(self.num_players)
        }

    def reset(
        self, *, seed: int | None = None, options: dict[str, Any] | None = None
    ) -> dict[str, np.ndarray]:
        super().reset(seed=seed, options=options)

        if self._game.started:
            self._game.log_game()

        self._game.start(num_players=self.num_players, seed=seed)

        return self._make_obs(), self._constant_agent_dict({}, False)

    def _constant_agent_dict(self, constant, with_all: bool) -> dict:
        d = {}
        if with_all:
            d["__all__"] = constant
        for i in range(self.num_players):
            d[self.player_index_to_name(i)] = constant
        return d

    def step(
        self, actions: dict[str, Sequence[float]]
    ) -> tuple[Any, SupportsFloat, bool, bool, dict[str, Any]]:
        old_state = self._game.state

        # Set player orders
        # TODO: Do this in one batch call
        for player_name, action in actions.items():
            player_index = self.player_name_to_index(player_name)
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
            {
                self.player_index_to_name(i): calculate_reward(
                    old_state=old_state,
                    new_state=new_state,
                    self_player_index=i,
                    other_player_index=1 - i,
                )
                for i in range(self.num_players)
            },
            self._constant_agent_dict(terminated, True),
            self._constant_agent_dict(False, True),
            self._constant_agent_dict({}, False),
        )
