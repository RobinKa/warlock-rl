import gzip
from glob import iglob
import os
import shutil

for log_file_path in iglob("./logs/**/*.json", recursive=True):
    print(log_file_path)
    with open(log_file_path, "rb") as log_file, gzip.open(
        log_file_path + ".gz", "wb"
    ) as log_file_compressed:
        shutil.copyfileobj(log_file, log_file_compressed)
    os.remove(log_file_path)
