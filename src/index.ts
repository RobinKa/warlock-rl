import { makeGame } from "@/gameplay";
import { Order } from "@/gameplay/components/order";

const { components, step, addPlayer } = makeGame({ deltaTime: 1 / 30 });

let localPlayerId = addPlayer({ e1: -50, e2: 0 });
let enemyPlayerId = addPlayer({ e1: 50, e2: 0 });

components.bodies[localPlayerId].velocity.e1 = -500;

process.stdout.write(JSON.stringify(components));

for await (const inputRaw of console) {
  let input: Order;
  try {
    input = JSON.parse(inputRaw);
  } catch {
    throw new Error(`Failed fo parse json: ${inputRaw}`);
  }

  if (input) {
    components.orders[localPlayerId].order = input;
  }
  step();

  process.stdout.write(JSON.stringify(components) + "\n");
}
