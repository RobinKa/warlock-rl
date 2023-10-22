import pytest

from warlock_rl.envs import WarlockEnv


@pytest.fixture
def unstarted_env():
    return WarlockEnv()


@pytest.fixture
def env():
    env = WarlockEnv()
    env.reset(seed=0)
    return env


def test_initial(unstarted_env: WarlockEnv):
    assert not unstarted_env._game.started
    unstarted_env.reset()
    assert unstarted_env._game.started
    assert len(unstarted_env._game.state["bodies"]) == 2, unstarted_env._game.state


def test_teleport(env: WarlockEnv):
    target = {"e1": 0, "e2": 0}
    assert env._game.state["bodies"]["1000"]["location"] != target, env._game.state
    env.step({"player_0": [0.5, 0.5, 0, 0, 0, 0, 0, 1, 0, 0]})
    assert env._game.state["bodies"]["1000"]["location"] == target, env._game.state


def test_move(env: WarlockEnv):
    env.step({"player_0": [0.5, 0.5, 0, 0, 0, 1, 0, 0, 0, 0]})
    for _ in range(50):
        env.step({"player_0": [0, 0, 0, 1, 0, 0, 0, 0, 0, 0]})
    assert env._game.state["bodies"]["1000"]["location"] == {
        "e1": 0,
        "e2": 0,
    }, env._game.state


def test_shoot(env: WarlockEnv):
    env.step({"player_0": [0.5, 0.5, 0, 0, 0, 0, 1, 0, 0, 0]})
    # Need to simulate at least 7 frames for the cast time.
    # Each step simulates 6, so we need 5 for 10 frames.
    for _ in range(1):
        assert len(env._game.state["projectiles"]) == 0, env._game.state
        env.step({"player_0": [0, 0, 0, 1, 0, 0, 0, 0, 0, 0]})
    assert len(env._game.state["projectiles"]) == 1, env._game.state


def test_scourge(env: WarlockEnv):
    env.step({"player_0": [0.5, 0.5, 0, 0, 0, 0, 0, 0, 1, 0]})
    # Need to simulate at least 27 frames for the cast time.
    # Each step simulates 6, so we need 5 for 30 frames.
    for _ in range(4):
        health = env._game.state["healths"]["1000"]["current"]
        assert health == 100, str(env._game.state)
        env.step({"player_0": [0, 0, 0, 1, 0, 0, 0, 0, 0, 0]})
    health = env._game.state["healths"]["1000"]["current"]
    assert 90 <= health < 100, env._game.state
