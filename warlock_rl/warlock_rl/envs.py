from typing import Any, Sequence, SupportsFloat

import gymnasium as gym
import numpy as np

from warlock_rl.game import Game

OBS_LOC_SCALE = 2_000

def state_to_obs(state: dict) -> np.ndarray:
    self_health = state["healths"]["1000"]["current"]
    other_health = state["healths"]["1001"]["current"]
    self_x = state["bodies"]["1000"]["location"]["e1"]
    self_y = state["bodies"]["1000"]["location"]["e2"]
    other_x = state["bodies"]["1001"]["location"]["e1"]
    other_y = state["bodies"]["1001"]["location"]["e2"]

    return np.clip(np.array(
        [
            self_health / 100,
            other_health / 100,
            self_x / OBS_LOC_SCALE + 0.5,
            self_y / OBS_LOC_SCALE + 0.5,
            other_x / OBS_LOC_SCALE + 0.5,
            other_y / OBS_LOC_SCALE + 0.5,
        ], np.float32
    ), 0, 1)

def action_to_order(action: Sequence[float]) -> dict | None:
    action_type = np.argmax(action[:3])
    target = {
        "e1": OBS_LOC_SCALE * (action[3] - 0.5),
        "e2": OBS_LOC_SCALE * (action[4] - 0.5),
    }

    match action_type:
        case 1:
            return {
                "type": "shoot",
                "target": target,
            }
        case 2:
            return {
                "type": "move",
                "target": target,
            }

    return None

class WarlockEnv(gym.Env):
    _game: Game | None = None

    def __init__(self, *args, **kwargs) -> None:
        # Actions:
        # 0: Nothing
        # 1: Shoot
        # 2: Move
        # 3: x
        # 4: y
        self.action_space = gym.spaces.Box(0, 1, (5,))

        # Observations:
        # 0: Self health
        # 1: Other health
        # 2: Self x
        # 3: Self y
        # 4: Other x
        # 5: Other y
        self.observation_space = gym.spaces.Box(0, 1, (6,))


    def reset(self, *, seed: int | None = None, options: dict[str, Any] | None = None) -> tuple[Any, dict[str, Any]]:
        super().reset(seed=seed, options=options)
        if self._game is not None:
            self._game.close()
        self._game = Game()
        return state_to_obs(self._game.state), {}

    def step(self, action: Sequence[float]) -> tuple[Any, SupportsFloat, bool, bool, dict[str, Any]]:
        order = action_to_order(action)

        old_state = self._game.state
        self._game.step(order)
        new_state = self._game.state

        reward = (
            (old_state["healths"]["1001"]["current"] - new_state["healths"]["1001"]["current"]) +
            (new_state["healths"]["1000"]["current"] - old_state["healths"]["1000"]["current"])
        ) / 100

        terminated = (
            new_state["gameState"]["deltaTime"] * new_state["gameState"]["frameNumber"] > 30 or
            new_state["healths"]["1000"]["current"] == 0 or
            new_state["healths"]["1001"]["current"] == 0
        )

        if terminated:
            self._game.close()
            self._game = None

        return state_to_obs(old_state), reward, terminated, False, {}
