import { makeGame } from "@/gameplay";
import { AbilityId } from "@/gameplay/components/abilities";
import { Order } from "@/gameplay/components/order";
import { buyAbility } from "@/gameplay/utils/shop";

let game: ReturnType<typeof makeGame> | undefined = undefined;

export type CLICommandStartGame = {
  type: "start";
  seed?: number;
  deltaTime?: number;
  numPlayers: number;
  startGold?: number;
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

export type CLICommandSetReady = {
  type: "setReady";
  entityId: number;
  ready: boolean;
};

export type CLICommandBuyAbility = {
  type: "buyAbility";
  entityId: number;
  abilityId: AbilityId;
};

export type CLICommandGetComponents = {
  type: "getComponents";
};

export type CLICommand =
  | CLICommandStartGame
  | CLICommandStep
  | CLICommandSetOrder
  | CLICommandSetReady
  | CLICommandBuyAbility
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
        seed: command.seed ?? Math.floor(1_000_000_000 * Math.random()),
      });

      for (let i = 0; i < command.numPlayers; i++) {
        game.addPlayer(command.startGold);
      }
      break;
    case "setOrder":
      if (!game) {
        throw new Error("Game not started");
      }
      game.components.orders[command.entityId].order = command.order;
      break;
    case "setReady":
      if (!game) {
        throw new Error("Game not started");
      }
      game.components.players[command.entityId].ready = command.ready;
      break;
    case "buyAbility":
      if (!game) {
        throw new Error("Game not started");
      }
      buyAbility(command.entityId, command.abilityId, game.components);
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
