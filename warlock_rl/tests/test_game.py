import math

import pytest

from warlock_rl.game import Game


@pytest.fixture
def unstarted_game():
    return Game()


@pytest.fixture
def shop_game(unstarted_game):
    unstarted_game = Game()
    unstarted_game.start(num_players=1, seed=0)
    assert unstarted_game.state["gameState"]["state"]["type"] == "shop"
    return unstarted_game


@pytest.fixture
def game(shop_game):
    for player_id in shop_game.state["players"].keys():
        shop_game.set_ready(int(player_id), True)
    shop_game.step(1)
    assert shop_game.state["gameState"]["state"]["type"] == "round"
    return shop_game


@pytest.mark.parametrize("num_players", list(range(10)))
def test_initial_state(unstarted_game: Game, num_players: int):
    unstarted_game.start(num_players=num_players, seed=None)

    assert len(unstarted_game.state["bodies"]) == num_players, unstarted_game.state
    assert len(unstarted_game.state["orders"]) == num_players, unstarted_game.state
    assert (
        len(unstarted_game.state["playerOwneds"]) == num_players
    ), unstarted_game.state


def test_move(game: Game):
    player_id = list(game.state["players"].keys())[0]
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

    for _ in range(300):
        if game.state["bodies"][player_id]["location"] == target:
            return
        game.step(
            steps=1,
        )

    assert game.state["bodies"][player_id]["location"] == target, game.state


def test_shoot(game: Game):
    assert len(game.state["projectiles"]) == 0, game.state

    player_id = list(game.state["players"].keys())[0]

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

    cast_frames = math.floor(0.2 / (1 / 30)) + 1
    print(cast_frames)
    for _ in range(cast_frames):
        assert len(game.state["projectiles"]) == 0, game.state
        game.step(
            steps=1,
        )

    assert len(game.state["projectiles"]) == 1, game.state


def test_teleport(shop_game: Game):
    player_id = list(shop_game.state["players"].keys())[0]

    assert "teleport" not in shop_game.state["abilities"][player_id], shop_game.state

    # Buy teleport and start the round
    shop_game.buy_ability(player_id, "teleport")
    for player_id in shop_game.state["players"].keys():
        shop_game.set_ready(int(player_id), True)
    print(shop_game.state["bodies"][player_id]["location"])
    shop_game.step(1)

    assert "teleport" in shop_game.state["abilities"][player_id], shop_game.state
    assert shop_game.state["gameState"]["state"]["type"] == "round"

    target = {
        "e1": 100,
        "e2": 100,
    }

    shop_game.order(
        entity_id=player_id,
        order={
            "type": "useAbility",
            "abilityId": "teleport",
            "target": target,
        },
    )

    for _ in range(100):
        print(shop_game.state["bodies"][player_id]["location"])
        shop_game.step(
            steps=1,
        )
        if shop_game.state["bodies"][player_id]["location"] == target:
            return

    assert shop_game.state["bodies"][player_id]["location"] == target


def test_scourge(game: Game):
    player_id = list(game.state["players"].keys())[0]

    game.order(
        entity_id=player_id,
        order={
            "type": "useAbility",
            "abilityId": "scourge",
        },
    )

    cast_frames = math.floor(0.9 / (1 / 30)) + 1
    for _ in range(cast_frames):
        assert game.state["healths"][player_id]["current"] == 100, str(game.state)
        game.step(
            steps=1,
        )
    # Should be frame 27?
    assert game.state["healths"][player_id]["current"] == 90, str(game.state)


def test_stop_scourge(game: Game):
    player_id = list(game.state["players"].keys())[0]

    game.order(
        entity_id=player_id,
        order={
            "type": "useAbility",
            "abilityId": "scourge",
        },
    )

    cast_frames = math.floor(0.9 / (1 / 30)) + 1
    for _ in range(10):
        assert game.state["healths"][player_id]["current"] == 100, str(game.state)
        game.step(
            steps=1,
        )
    game.order(
        entity_id=player_id,
        order={
            "type": "stop",
        },
    )

    for _ in range(cast_frames):
        assert game.state["healths"][player_id]["current"] == 100, str(game.state)
        game.step(
            steps=1,
        )
    assert game.state["healths"][player_id]["current"] == 100, str(game.state)
