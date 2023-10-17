import { makeGame } from "@/gameplay";
import { Order } from "@/gameplay/components/order";

let game: ReturnType<typeof makeGame> | undefined = undefined;

export type CLICommandStartGame = {
  type: "start";
  seed?: number;
  deltaTime?: number;
  numPlayers: number;
};

export type CLICommandStep = {
  type: "step";
  steps: number;
};

export type CLICommandSetOrder = {
  type: "setOrder";
  entityId: number;
  order: Order;
};

export type CLICommandGetComponents = {
  type: "getComponents";
};

export type CLICommand =
  | CLICommandStartGame
  | CLICommandStep
  | CLICommandSetOrder
  | CLICommandGetComponents;

for await (const line of console) {
  const command: CLICommand = JSON.parse(line);

  switch (command.type) {
    case "step":
      if (!game) {
        throw new Error("Game not started");
      }
      for (let i = 0; i < command.steps; i++) {
        game.step();
      }
      break;
    case "start":
      game = makeGame({
        deltaTime: command.deltaTime ?? 1 / 30,
        seed:
          command.seed === undefined
            ? Math.floor(1_000_000_000 * Math.random())
            : command.seed,
      });

      for (let i = 0; i < command.numPlayers; i++) {
        game.addPlayer();
      }
      break;
    case "setOrder":
      if (!game) {
        throw new Error("Game not started");
      }
      game.components.orders[command.entityId].order = command.order;
      break;
    case "getComponents":
      if (!game) {
        throw new Error("Game not started");
      }
      process.stdout.write(JSON.stringify(game.components));
      break;
    default:
      throw new Error(`Unhandled command ${command}`);
  }
}
