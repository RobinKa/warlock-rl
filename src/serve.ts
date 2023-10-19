import { Router } from "@stricjs/router";
import { dir } from "@stricjs/utils";
import { GameComponent } from "./gameplay/components";
import fs from "fs/promises";

async function readReplay(path: string): Promise<GameComponent[]> {
  const arrbuf = await Bun.file(path).arrayBuffer();
  let buffer = Buffer.from(arrbuf);

  if (path.endsWith(".gz")) {
    buffer = Buffer.from(await Bun.gunzipSync(buffer));
  }

  return JSON.parse(buffer.toString("utf-8")) as GameComponent[];
}

export default new Router()
  .get("/replay", async () => {
    const replays = [];
    for (const name of await fs.readdir("logs")) {
      const replayStat = await fs.stat("logs/" + name);
      replays.push({
        name,
        createdAt: replayStat.ctime.toISOString(),
      });
    }
    return new Response(JSON.stringify(replays), {
      headers: { "Content-Type": "application/json" },
    });
  })
  .get("/replay/*", async (ctx) => {
    let path = "./logs/" + ctx.params["*"] + "/state_history.json";
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
