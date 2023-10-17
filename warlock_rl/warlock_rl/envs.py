from typing import Any, Sequence, SupportsFloat

import gymnasium as gym
import numpy as np

from warlock_rl.game import Game

OBS_LOC_SCALE = 2_000
MAX_TIME = 30


def state_to_obs(state: dict) -> np.ndarray:
    self_health = state["healths"]["1000"]["current"]
    other_health = state["healths"]["1001"]["current"]
    self_x = state["bodies"]["1000"]["location"]["e1"]
    self_y = state["bodies"]["1000"]["location"]["e2"]
    other_x = state["bodies"]["1001"]["location"]["e1"]
    other_y = state["bodies"]["1001"]["location"]["e2"]
    elapsed_time = state["gameState"]["deltaTime"] * state["gameState"]["frameNumber"]

    return np.clip(
        np.array(
            [
                self_health / 100,
                other_health / 100,
                self_x / OBS_LOC_SCALE + 0.5,
                self_y / OBS_LOC_SCALE + 0.5,
                other_x / OBS_LOC_SCALE + 0.5,
                other_y / OBS_LOC_SCALE + 0.5,
                elapsed_time / MAX_TIME,
            ],
            np.float32,
        ),
        0,
        1,
    )


def action_to_order(action: Sequence[float]) -> dict | None:
    target = {
        "e1": OBS_LOC_SCALE * (action[0] - 0.5),
        "e2": OBS_LOC_SCALE * (action[1] - 0.5),
    }
    action_type = np.argmax(action[2:])

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

    raise ValueError(f"Unhandled action {action=} {action_type=}")


class WarlockEnv(gym.Env):
    _game: Game | None = None

    def __init__(self, *args, **kwargs) -> None:
        # Actions:
        # 0: x
        # 1: y
        # 2: Nothing
        # 3: Move
        # 4: Shoot
        # 5: Teleport
        self.action_space = gym.spaces.Box(0, 1, (6,))

        # Observations:
        # 0: Self health
        # 1: Other health
        # 2: Self x
        # 3: Self y
        # 4: Other x
        # 5: Other y
        # 6: Time
        self.observation_space = gym.spaces.Box(0, 1, (7,))

        self._game = Game()

    def reset(
        self, *, seed: int | None = None, options: dict[str, Any] | None = None
    ) -> tuple[Any, dict[str, Any]]:
        super().reset(seed=seed, options=options)

        if self._game.started:
            self._game.log_game()

        self._game.start(num_players=2, seed=seed)

        return state_to_obs(self._game.state), {}

    def step(
        self, action: Sequence[float]
    ) -> tuple[Any, SupportsFloat, bool, bool, dict[str, Any]]:
        order = action_to_order(action)

        old_state = self._game.state
        if order is not None:
            self._game.order(entity_id=1000, order=order)
        self._game.step(steps=6)
        new_state = self._game.state

        reward = (
            (
                old_state["healths"]["1001"]["current"]
                - new_state["healths"]["1001"]["current"]
            )
            + (
                new_state["healths"]["1000"]["current"]
                - old_state["healths"]["1000"]["current"]
            )
        ) / 100 - 0.01

        terminated = (
            new_state["gameState"]["deltaTime"] * new_state["gameState"]["frameNumber"]
            >= MAX_TIME
            or new_state["healths"]["1000"]["current"] == 0
            or new_state["healths"]["1001"]["current"] == 0
        )

        return state_to_obs(new_state), reward, terminated, False, {}
