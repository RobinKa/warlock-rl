from glob import glob
import shutil
import os

replays = glob("logs/**/state_history.json", recursive=True)
latest_replay = max(replays, key=os.path.getctime)
shutil.copy(latest_replay, "src/render/state_history.json")
