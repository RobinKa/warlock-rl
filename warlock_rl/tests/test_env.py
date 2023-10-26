import numpy as np
import pytest

from warlock_rl.envs import MAX_TIME, OBS_LOC_SCALE, WarlockEnv, state_to_obs


@pytest.fixture
def unstarted_env():
    return WarlockEnv()


@pytest.fixture
def shop_env(unstarted_env: WarlockEnv):
    obs, _ = unstarted_env.reset(seed=0)
    assert unstarted_env.shopping
    assert set(obs.keys()) == {"shop_0", "shop_1"}
    return unstarted_env


@pytest.fixture
def env(shop_env: WarlockEnv):
    for _ in range(10):
        assert shop_env.shopping
        obs, *_ = shop_env.step(
            {
                "shop_0": 0,
                "shop_1": 0,
            }
        )
        if not shop_env.shopping:
            break
        assert set(obs.keys()) == {"shop_0", "shop_1"}

    assert not shop_env.shopping
    assert set(obs.keys()) == {0, 1}

    return shop_env


def test_initial(unstarted_env: WarlockEnv):
    assert not unstarted_env._game.started
    unstarted_env.reset()
    assert unstarted_env._game.started
    assert len(unstarted_env._game.state["bodies"]) == 2, unstarted_env._game.state


def test_teleport(shop_env: WarlockEnv):
    # Buy teleport
    shop_env.step({"shop_0": 3, "shop_1": 0})
    for _ in range(10):
        if not shop_env.shopping:
            break
        shop_env.step({"shop_0": 0, "shop_1": 0})
    assert not shop_env.shopping

    # Use teleport
    target = {"e1": 0, "e2": 0}
    assert shop_env._game.state["bodies"]["1000"]["location"] != target
    shop_env.step({0: [0.5, 0.5, 0, 0, 0, 0, 0, 1, 0, 0]})
    assert shop_env._game.state["bodies"]["1000"]["location"] == target


def test_move(env: WarlockEnv):
    env.step({0: [0.5, 0.5, 0, 0, 0, 1, 0, 0, 0, 0]})
    for _ in range(50):
        env.step({0: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0]})
    assert env._game.state["bodies"]["1000"]["location"] == {
        "e1": 0,
        "e2": 0,
    }, env._game.state


def test_shoot(env: WarlockEnv):
    env.step({0: [0.5, 0.5, 0, 0, 0, 0, 1, 0, 0, 0]})
    # Need to simulate at least 7 frames for the cast time.
    # Each step simulates 6, so we need 5 for 10 frames.
    for _ in range(1):
        assert len(env._game.state["projectiles"]) == 0, env._game.state
        env.step({0: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0]})
    assert len(env._game.state["projectiles"]) == 1, env._game.state


def test_scourge(env: WarlockEnv):
    env.step({0: [0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 1]})
    # Need to simulate at least 27 frames for the cast time.
    # Each step simulates 6, so we need 5 for 30 frames.
    for _ in range(4):
        health = env._game.state["healths"]["1000"]["current"]
        assert health == 100
        env.step({0: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0]})
    health = env._game.state["healths"]["1000"]["current"]
    assert 90 <= health < 100


@pytest.fixture
def components():
    return {
        "gameState": {
            "frameNumber": 200,
            "deltaTime": 1 / 30,
            "state": {
                "type": "round",
                "startFrame": 100,
            },
        },
        "arena": {
            "radius": 500,
        },
        "playerOwneds": {
            "1000": {
                "owningPlayerId": 1000,
            },
            "1001": {
                "owningPlayerId": 1001,
            },
            "1002": {
                "owningPlayerId": 1000,
            },
            "1003": {
                "owningPlayerId": 1001,
            },
        },
        "healths": {
            "1000": {"current": 30, "maximum": 100},
            "1001": {"current": 100, "maximum": 100},
        },
        "bodies": {
            "1000": {
                "location": {"e1": 0, "e2": 0},
                "facing": 0,
            },
            "1001": {
                "location": {"e1": 0, "e2": 100},
                "facing": np.pi / 2,
            },
            "1002": {
                "location": {"e1": 100, "e2": 0},
            },
            "1003": {
                "location": {"e1": 500, "e2": 100},
            },
        },
        "abilities": {
            "1000": {
                "shoot": {"cooldown": 7},
                "scourge": {"lastUsedFrame": 100, "cooldown": 3},
                "teleport": {"cooldown": 8},
                "homing": {"cooldown": 9},
            },
            "1001": {
                "shoot": {"cooldown": 12},
                "scourge": {"cooldown": 11},
                "teleport": {"cooldown": 13},
                "homing": {"cooldown": 14},
            },
        },
        "units": {
            "1000": {
                "state": {
                    "type": "moving",
                }
            },
            "1001": {
                "state": {
                    "type": "casting",
                }
            },
        },
        "projectiles": {
            "1002": {},
            "1003": {},
        },
    }


def test_state_to_obs(unstarted_env: WarlockEnv, components: dict):
    obs = state_to_obs(components, 0, 1)
    assert len(obs) == unstarted_env.observation_space.shape[0]

    # Time
    assert obs[0] == pytest.approx((100 * (1 / 30)) / MAX_TIME, 1e-5)

    # TODO: Fix and make more maintainable?
    # # Player 1000 Obs
    # assert obs[1] == pytest.approx(30 / 100, 1e-5)  # hp
    # assert obs[2] == pytest.approx(0 / OBS_LOC_SCALE + 0.5, 1e-5)  # x
    # assert obs[3] == pytest.approx(0 / OBS_LOC_SCALE + 0.5, 1e-5)  # y
    # assert obs[4] == pytest.approx(1, 1e-5)  # facing x
    # assert obs[5] == pytest.approx(0.5, 1e-5)  # facing y
    # assert obs[6] == pytest.approx(0, 1e-5)  # casting
    # assert obs[7] == pytest.approx(1, 1e-5)  # moving
    # assert obs[8] == pytest.approx(0, 1e-5)  # cd shoot
    # assert obs[9] == pytest.approx(1, 1e-5)  # cd scourge
    # assert obs[10] == pytest.approx(0, 1e-5)  # cd teleport
    # assert obs[11] == pytest.approx(0, 1e-5)  # cd homing

    # # Player 1001 Obs
    # assert obs[12] == pytest.approx(100 / 100, 1e-5)  # hp
    # assert obs[13] == pytest.approx(0 / OBS_LOC_SCALE + 0.5, 1e-5)  # x
    # assert obs[14] == pytest.approx(100 / OBS_LOC_SCALE + 0.5, 1e-5)  # y
    # assert obs[15] == pytest.approx(0.5, 1e-5)  # facing x
    # assert obs[16] == pytest.approx(1.0, 1e-5)  # facing y
    # assert obs[17] == pytest.approx(1, 1e-5)  # casting
    # assert obs[18] == pytest.approx(0, 1e-5)  # moving
    # assert obs[19] == pytest.approx(0, 1e-5)  # cd shoot
    # assert obs[20] == pytest.approx(0, 1e-5)  # cd scourge
    # assert obs[21] == pytest.approx(0, 1e-5)  # cd teleport
    # assert obs[22] == pytest.approx(0, 1e-5)  # cd homing

    # # Projectile 1
    # assert obs[23] == pytest.approx(100 / OBS_LOC_SCALE + 0.5, 1e-5)  # y
    # assert obs[24] == pytest.approx(0 / OBS_LOC_SCALE + 0.5, 1e-5)  # x
    # assert obs[25] == pytest.approx(0, 1e-5)  # is enemy

    # # Projectile 2
    # assert obs[26] == pytest.approx(500 / OBS_LOC_SCALE + 0.5, 1e-5)  # y
    # assert obs[27] == pytest.approx(100 / OBS_LOC_SCALE + 0.5, 1e-5)  # x
    # assert obs[28] == pytest.approx(1, 1e-5)  # is enemy

    # # Projectile 3
    # assert obs[29] == pytest.approx(0.5, 1e-5)  # y
    # assert obs[30] == pytest.approx(0.5, 1e-5)  # x
    # assert obs[31] == pytest.approx(0.5, 1e-5)  # is enemy

    # obs = state_to_obs(components, 1, 0)
    # assert len(obs) == unstarted_env.observation_space.shape[0]

    # # Time
    # assert obs[0] == pytest.approx((100 * (1 / 30)) / MAX_TIME, 1e-5)

    # # Player 1000 Obs
    # assert obs[12] == pytest.approx(30 / 100, 1e-5)  # hp
    # assert obs[13] == pytest.approx(0 / OBS_LOC_SCALE + 0.5, 1e-5)  # x
    # assert obs[14] == pytest.approx(0 / OBS_LOC_SCALE + 0.5, 1e-5)  # y
    # assert obs[15] == pytest.approx(1, 1e-5)  # facing x
    # assert obs[16] == pytest.approx(0.5, 1e-5)  # facing y
    # assert obs[17] == pytest.approx(0, 1e-5)  # casting
    # assert obs[18] == pytest.approx(1, 1e-5)  # moving
    # assert obs[19] == pytest.approx(0, 1e-5)  # cd shoot
    # assert obs[20] == pytest.approx(1, 1e-5)  # cd scourge
    # assert obs[21] == pytest.approx(0, 1e-5)  # cd teleport
    # assert obs[22] == pytest.approx(0, 1e-5)  # cd homing

    # # Player 1001 Obs
    # assert obs[1] == pytest.approx(100 / 100, 1e-5)  # hp
    # assert obs[2] == pytest.approx(0 / OBS_LOC_SCALE + 0.5, 1e-5)  # x
    # assert obs[3] == pytest.approx(100 / OBS_LOC_SCALE + 0.5, 1e-5)  # y
    # assert obs[4] == pytest.approx(0.5, 1e-5)  # facing x
    # assert obs[5] == pytest.approx(1.0, 1e-5)  # facing y
    # assert obs[6] == pytest.approx(1, 1e-5)  # casting
    # assert obs[7] == pytest.approx(0, 1e-5)  # moving
    # assert obs[8] == pytest.approx(0, 1e-5)  # cd shoot
    # assert obs[9] == pytest.approx(0, 1e-5)  # cd scourge
    # assert obs[10] == pytest.approx(0, 1e-5)  # cd teleport
    # assert obs[11] == pytest.approx(0, 1e-5)  # cd homing

    # # Projectile 1
    # assert obs[23] == pytest.approx(100 / OBS_LOC_SCALE + 0.5, 1e-5)  # y
    # assert obs[24] == pytest.approx(0 / OBS_LOC_SCALE + 0.5, 1e-5)  # x
    # assert obs[25] == pytest.approx(1, 1e-5)  # is enemy

    # # Projectile 2
    # assert obs[26] == pytest.approx(500 / OBS_LOC_SCALE + 0.5, 1e-5)  # y
    # assert obs[27] == pytest.approx(100 / OBS_LOC_SCALE + 0.5, 1e-5)  # x
    # assert obs[28] == pytest.approx(0, 1e-5)  # is enemy

    # # Projectile 3
    # assert obs[29] == pytest.approx(0.5, 1e-5)  # y
    # assert obs[30] == pytest.approx(0.5, 1e-5)  # x
    # assert obs[31] == pytest.approx(0.5, 1e-5)  # is enemy
