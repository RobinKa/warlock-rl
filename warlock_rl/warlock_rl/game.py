import os
import subprocess
import uuid

import ujson as json


class Game:
    def __init__(self):
        self._game_id = str(uuid.uuid4())
        self._game_log_dir = os.path.join("..", "logs", self._game_id)
        os.makedirs(self._game_log_dir, exist_ok=True)

        print("Starting game", self._game_id)
        self._process = subprocess.Popen(
            ["bun", "run", os.path.join("src", "index.ts")],
            cwd=os.path.join(os.path.dirname(__file__), "..", ".."),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            bufsize=0,
        )

        self._state_history = []

        # Read initial state
        self._read_state()

    def _read_state(self):
        output_raw = self._process.stdout.read(128_000)
        self._state = json.loads(output_raw)
        self._state_history.append(self._state)

    @property
    def state(self):
        return self._state

    def step(self, action: dict | None):
        # Write action
        line = json.dumps(action) if action else "null"
        self._process.stdin.write(f"{line}\n".encode("utf-8"))

        # Do some non-action steps
        for i in range(5):
            self._process.stdout.read(128_000)
            self._process.stdin.write("null\n".encode("utf-8"))

        # Read new state
        self._read_state()

    def close(self):
        self._process.stdin.close()
        self._process.terminate()
        self._process.wait()
        
        with open(os.path.join(self._game_log_dir, "state_history.json"), "w", encoding="utf-8") as state_history_file:
            json.dump(self._state_history, state_history_file)
