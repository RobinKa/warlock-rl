from typing import Any, Sequence, SupportsFloat

import gymnasium as gym
import numpy as np
from ray.rllib.env.multi_agent_env import MultiAgentEnv

from warlock_rl.game import Game

OBS_LOC_SCALE = 2_000
ROUND_TIME_SCALE = 180
MAX_ROUNDS = 3

index_to_entity_id = {
    0: "1000",
    1: "1001",
    "shop_0": "1000",
    "shop_1": "1001",
}

ABILITY_IDS = [
    "shoot",
    "scourge",
    "teleport",
    "swap",
    "homing",
    "shield",
]


# TODO: make work for arbitrary number of players
def state_to_obs(
    state: dict, self_player_index: int, other_player_index: int
) -> np.ndarray:
    self_entity_id = index_to_entity_id[self_player_index]
    other_entity_id = index_to_entity_id[other_player_index]

    def get_ability_relative_cooldown(entity_id: str, ability_id: str) -> float:
        if ability_id not in state["abilities"][entity_id]:
            return 1
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
            for ability_id in ABILITY_IDS
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

    elapsed_time = state["gameState"]["deltaTime"] * (
        state["gameState"]["frameNumber"] - state["gameState"]["state"]["startFrame"]
    )

    observations = (
        [
            elapsed_time / ROUND_TIME_SCALE,
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

    assert obs.shape == (1 + 2 * 13 + 3 * 3,), obs.shape
    assert all(0 <= o <= 1 for o in obs), obs

    return obs


def state_to_shop_obs(
    state: dict, self_player_index: int, other_player_index: int
) -> np.ndarray:
    # TODO: Add opponent stuff
    self_entity_id = index_to_entity_id[self_player_index]

    def has_ability(ability_id: str) -> bool:
        return ability_id in state["abilities"][self_entity_id]

    gold = state["shops"][self_entity_id]["gold"]
    has_abilities = [1 if has_ability(ability_id) else 0 for ability_id in ABILITY_IDS]

    return np.clip([gold / 50, *has_abilities], 0, 1, dtype=np.float32)


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

    return reward


def action_to_order(
    player_index: int, state: dict, action: Sequence[float]
) -> dict | None:
    player_entity_id = index_to_entity_id[player_index]

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
            if "shoot" not in state["abilities"][player_entity_id]:
                return None
            return {
                "type": "useAbility",
                "abilityId": "shoot",
                "target": target,
            }
        case 4:
            if "teleport" not in state["abilities"][player_entity_id]:
                return None
            target["e1"] *= 0.25
            target["e2"] *= 0.25
            return {
                "type": "useAbility",
                "abilityId": "teleport",
                "target": target,
            }
        case 5:
            if "swap" not in state["abilities"][player_entity_id]:
                return None
            target["e1"] *= 0.25
            target["e2"] *= 0.25
            return {
                "type": "useAbility",
                "abilityId": "swap",
                "target": target,
            }
        case 6:
            if "scourge" not in state["abilities"][player_entity_id]:
                return None
            return {
                "type": "useAbility",
                "abilityId": "scourge",
            }
        case 7:
            if "homing" not in state["abilities"][player_entity_id]:
                return None
            return {
                "type": "useAbility",
                "abilityId": "homing",
                "target": target,
            }
        case 8:
            if "shield" not in state["abilities"][player_entity_id]:
                return None
            return {
                "type": "useAbility",
                "abilityId": "shield",
            }

    raise ValueError(f"Unhandled action {action=} {action_type=}")


class WarlockEnv(MultiAgentEnv):
    _game: Game | None = None

    round_action_space = gym.spaces.Box(0, 1, (12,))
    round_observation_space = gym.spaces.Box(0, 1, (1 + 2 * 13 + 3 * 3,))

    shop_action_space = gym.spaces.Discrete(1 + len(ABILITY_IDS))
    shop_observation_space = gym.spaces.Box(0, 1, (1 + len(ABILITY_IDS),))

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
        # 8: Swap
        # 9: Scourge
        # 10: Homing
        # 11: Shield

        self._agent_ids = set(
            list(range(num_players)) + [f"shop_{i}" for i in range(num_players)]
        )

        self._game = Game()

        super().__init__()

    @property
    def num_players(self):
        return self._num_players

    def _make_round_obs(self):
        assert not self.shopping
        return {
            i: state_to_obs(self._game.state, i, 1 - i) for i in range(self.num_players)
        }

    def _make_shop_obs(self):
        assert self.shopping
        return {
            f"shop_{i}": state_to_shop_obs(self._game.state, i, 1 - i)
            for i in range(self.num_players)
        }

    def _make_obs(self):
        return self._make_shop_obs() if self.shopping else self._make_round_obs()

    @property
    def shopping(self) -> bool:
        return self._game.state["gameState"]["state"]["type"] == "shop"

    @property
    def shop_frames(self) -> bool:
        assert self.shopping
        return (
            self._game.state["gameState"]["frameNumber"]
            - self._game.state["gameState"]["state"]["startFrame"]
        )

    def reset(
        self, *, seed: int | None = None, options: dict[str, Any] | None = None
    ) -> dict[str, np.ndarray]:
        super().reset(seed=seed, options=options)

        if self._game.started and self._game.logging:
            self._game.log_game()

        self._game.start(
            num_players=self.num_players, seed=seed, logging=np.random.random() < 0.01
        )

        return self._make_obs(), {}

    def _constant_agent_dict(self, constant, with_all: bool) -> dict:
        d = {i: constant for i in range(self.num_players)}
        d.update({f"shop_{i}": constant for i in range(self.num_players)})
        if with_all:
            d["__all__"] = constant
        return d

    def step(
        self, actions: dict[int, Sequence[float]]
    ) -> tuple[Any, SupportsFloat, bool, bool, dict[str, Any]]:
        if self.shopping:
            assert set(actions.keys()) == {"shop_0", "shop_1"}
            # Buy abilities
            for shop_agent_id, action in actions.items():
                if action != 0:
                    self._game.buy_ability(
                        entity_id=index_to_entity_id[shop_agent_id],
                        ability_id=ABILITY_IDS[action - 1],
                    )

            # Step game one frame so buys go through
            self._game.step(1)
            assert self.shopping

            # Set ready after a few shop frames
            if self.shop_frames >= 3:
                for player_id in self._game.state["players"].keys():
                    self._game.set_ready(player_id, True)
                self._game.step(1)
                assert not self.shopping

            return (
                self._make_obs(),
                self._constant_agent_dict(0, False),
                self._constant_agent_dict(False, True),
                self._constant_agent_dict(False, True),
                {},
            )
        else:
            assert set(actions.keys()) == {0, 1}
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
            terminated = False
            for _ in range(6):
                self._game.step(steps=1)
                new_state = self._game.state

                terminated = (
                    new_state["gameState"]["round"] == MAX_ROUNDS and self.shopping
                )
                if terminated or self.shopping:
                    break

            # Check for round over and give reward to winners
            winners = []
            for event in new_state["gameEvents"]["events"]:
                if event["type"] == "roundOver":
                    winners += event["winners"]
            rewards = {
                i: 1 if int(index_to_entity_id[i]) in winners else 0
                for i in range(self.num_players)
            }
            for k, v in rewards.copy().items():
                rewards[f"shop_{k}"] = v

            return (
                self._make_obs(),
                rewards,
                self._constant_agent_dict(terminated, True),
                self._constant_agent_dict(False, True),
                {},
            )
