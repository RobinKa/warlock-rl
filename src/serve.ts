import { Router } from "@stricjs/router";
import { dir } from "@stricjs/utils";
import { sleep } from "bun";
import fs from "fs/promises";
import { GameComponent } from "./gameplay/components";

async function readReplay(path: string): Promise<GameComponent[]> {
  const retries = 5; // sometimes the file isn't completely written yet
  for (let i = 0; i < retries; i++) {
    try {
      const arrbuf = await Bun.file(path).arrayBuffer();
      let buffer = Buffer.from(arrbuf);

      if (path.endsWith(".gz")) {
        buffer = Buffer.from(await Bun.gunzipSync(buffer));
      }

      return JSON.parse(buffer.toString("utf-8")) as GameComponent[];
    } catch {
      if (i >= retries) {
        throw new Error("Max retries reached");
      }

      await sleep(200);
    }
  }

  throw new Error("Unreachable");
}

const LOG_DIR = "./logs/"; //"/mnt/e/warlock_rl_logs/logs/";

export default new Router()
  .get("/replay", async () => {
    const names = await fs.readdir(LOG_DIR);
    names.sort();
    const replayName = names[names.length - 1];

    return new Response(JSON.stringify({ name: replayName }), {
      headers: { "Content-Type": "application/json" },
    });
  })
  .get("/replay/*", async (ctx) => {
    let path = LOG_DIR + ctx.params["*"] + "/state_history.json";

    if (!(await Bun.file(path).exists())) {
      path += ".gz";
    }
    if (!(await Bun.file(path).exists())) {
      return new Response("Replay not found", { status: 404 });
    }

    return new Response(JSON.stringify(await readReplay(path)), {
      headers: { "Content-Type": "application/json" },
    });
  })
  .get("/*", dir("./build"));
