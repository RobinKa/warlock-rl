import pytest

from warlock_rl.game import Game


@pytest.mark.parametrize("num_players", list(range(10)))
def test_initial_state(num_players: int):
    game = Game()
    game.start(num_players=num_players, seed=None)

    assert len(game.state["bodies"]) == num_players, game.state
    assert len(game.state["orders"]) == num_players, game.state
    assert len(game.state["playerOwneds"]) == num_players, game.state


def test_move():
    game = Game()
    game.start(num_players=1, seed=None)

    player_id = list(game.state["bodies"].keys())[0]
    target = {
        "e1": 100,
        "e2": 100,
    }

    game.order(
        entity_id=player_id,
        order={
            "type": "move",
            "target": target,
        },
    )

    game.step(
        steps=300,
    )

    assert game.state["bodies"][player_id]["location"] == target, game.state


def test_shoot():
    game = Game()
    game.start(num_players=1, seed=None)

    assert len(game.state["projectiles"]) == 0, game.state

    player_id = list(game.state["bodies"].keys())[0]

    target = {
        "e1": 100,
        "e2": 100,
    }

    game.order(
        entity_id=player_id,
        order={
            "type": "useAbility",
            "abilityId": "shoot",
            "target": target,
        },
    )

    game.step(
        steps=1,
    )

    assert len(game.state["projectiles"]) == 1, game.state


def test_teleport():
    game = Game()
    game.start(num_players=1, seed=None)

    player_id = list(game.state["bodies"].keys())[0]

    target = {
        "e1": 100,
        "e2": 100,
    }

    game.order(
        entity_id=player_id,
        order={
            "type": "useAbility",
            "abilityId": "teleport",
            "target": target,
        },
    )

    game.step(
        steps=1,
    )

    assert game.state["bodies"][player_id]["location"] == target, game.state

def test_scourge():
    game = Game()
    game.start(num_players=1, seed=None)

    player_id = list(game.state["bodies"].keys())[0]

    game.order(
        entity_id=player_id,
        order={
            "type": "useAbility",
            "abilityId": "scourge",
        },
    )

    game.step(
        steps=1,
    )

    assert game.state["healths"][player_id]["current"] == 90, game.state
