import os
import subprocess
import uuid
from dataclasses import dataclass
from typing import Literal

import ujson as json
from dataclasses_json import dataclass_json


@dataclass_json
@dataclass
class CLICommandVector:
    e1: float
    e2: float


@dataclass_json
@dataclass
class CLICommandStartGamePlayerInfo:
    location: CLICommandVector
    velocity: CLICommandVector


@dataclass_json
@dataclass
class CLICommandStartGame:
    numPlayers: int
    type: Literal["start"] = "start"
    seed: int | None = None
    deltaTime: float | None = None


@dataclass_json
@dataclass
class CLICommandStep:
    type: Literal["step"] = "step"
    steps: int = 1


@dataclass_json
@dataclass
class CLICommandSetOrder:
    entityId: int
    order: dict
    type: Literal["setOrder"] = "setOrder"


@dataclass_json
@dataclass
class CLICommandGetComponents:
    type: Literal["getComponents"] = "getComponents"


CLICommand = (
    CLICommandStartGame | CLICommandStep | CLICommandSetOrder | CLICommandGetComponents
)


class Game:
    def __init__(self):
        self._process = subprocess.Popen(
            ["bun", "run", os.path.join("src", "cli", "index.ts")],
            cwd=os.path.join(os.path.dirname(__file__), "..", ".."),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            bufsize=0,
        )

        self._state_history = []
        self._state = None
        self._game_id = None

    def start(self, num_players: int, seed: int | None):
        if self._game_id is not None:
            self._state_history.clear()

        self._game_id = str(uuid.uuid4())
        print("Starting game", self._game_id)

        self._send_command(CLICommandStartGame(seed=seed, numPlayers=num_players))

        # Read initial state
        self._read_state()

    @property
    def state(self):
        return self._state
    
    @property
    def started(self):
        return self._game_id is not None

    def log_game(self):
        game_log_dir = os.path.join("..", "logs", self._game_id)
        print("Logging game to", os.path.abspath(game_log_dir))
        os.makedirs(game_log_dir, exist_ok=True)
        with open(
            os.path.join(game_log_dir, "state_history.json"),
            "w",
            encoding="utf-8",
        ) as state_history_file:
            json.dump(self._state_history, state_history_file)

    def _read_state(self):
        self._send_command(CLICommandGetComponents())
        output_raw = self._process.stdout.read(128_000)
        self._state = json.loads(output_raw)
        self._state_history.append(self._state)

    def _send_command(self, command: CLICommand):
        self._process.stdin.write(f"{command.to_json()}\n".encode("utf-8"))

    def order(self, entity_id: int, order: dict):
        self._send_command(
            CLICommandSetOrder(
                entityId=entity_id,
                order=order,
            )
        )

    def step(self, steps: int):
        # Step for some frames
        self._send_command(CLICommandStep(steps=steps))

        # Read new state
        self._read_state()

    def close(self):
        self._process.stdin.close()
        self._process.terminate()
        self._process.wait()
