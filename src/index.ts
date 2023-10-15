import { makeGame } from "@/gameplay";
import { Order } from "@/gameplay/components/order";

const { components, step, addPlayer } = makeGame({
  deltaTime: 1 / 30,
  seed: Math.floor(1_000_000_000 * Math.random()),
});

let localPlayerId = addPlayer({ e1: -50, e2: 0 }, true);
let enemyPlayerId = addPlayer({ e1: 50, e2: 0 }, false);

components.bodies[localPlayerId].velocity.e1 = -500;

process.stdout.write(JSON.stringify(components));

let inputBuffer = "";
for await (const inputRaw of Bun.stdin.stream()) {
  inputBuffer += Buffer.from(inputRaw).toString();

  const parts = inputBuffer.split("\n", 2);
  if (parts.length < 2) {
    continue;
  }

  const jsonRaw = parts[0];
  inputBuffer = parts[1];

  let input: Order;
  try {
    input = JSON.parse(jsonRaw);
  } catch {
    throw new Error(`Failed fo parse json: ${jsonRaw}`);
  }

  if (input) {
    components.orders[localPlayerId].order = input;
  }
  step();

  process.stdout.write(JSON.stringify(components) + "\n");
}
