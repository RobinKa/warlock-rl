from warlock_rl.envs import WarlockEnv
import pytest


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
    env.step([0.5, 0.5, 0, 0, 0, 1])
    assert env._game.state["bodies"]["1000"]["location"] == {
        "e1": 0,
        "e2": 0,
    }, env._game.state


def test_move(env: WarlockEnv):
    env.step([0.5, 0.5, 0, 1, 0, 0])
    for _ in range(50):
        env.step([0, 0, 1, 0, 0, 0])
    assert env._game.state["bodies"]["1000"]["location"] == {
        "e1": 0,
        "e2": 0,
    }, env._game.state


def test_shoot(env: WarlockEnv):
    env.step([0.5, 0.5, 0, 0, 1, 0])
    assert len(env._game.state["projectiles"]) == 1, env._game.state
