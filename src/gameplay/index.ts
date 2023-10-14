import * as pga from "@/common/ga_zpp";
import { GameComponent } from "./components";
import { gameSystem } from "./systems";

export type MakeGameOptions = {
  deltaTime: number;
};

export const makeGame = ({ deltaTime }: MakeGameOptions) => {
  const components: GameComponent = {
    gameState: {
      deltaTime,
      frameNumber: 0,
      moveSpeed: 210,
      nextEntityId: 1_000,
    },
    arena: {
      radius: 32 * 20,
      lavaDamage: 10,
      nextShrinkTime: 10,
      shrinkInterval: 10,
      shrinkRadius: 32,
    },
    actions: {},
    bodies: {},
    healths: {},
    lifetimes: {},
    playerOwneds: {},
    projectiles: {},
    orders: {},
    cooldowns: {},
  };

  function step() {
    gameSystem(components);
  }

  function addPlayer(location: pga.BladeE1 & pga.BladeE2): number {
    const { gameState, bodies, healths, orders, playerOwneds, cooldowns } =
      components;

    const entityId = gameState.nextEntityId++;

    bodies[entityId] = {
      location: location,
      velocity: { e1: 0, e2: 0 },
      force: { e1: 0, e2: 0 },
      radius: 30,
      dampening: 0.97,
    };

    healths[entityId] = {
      current: 100,
      maximum: 100,
    };

    orders[entityId] = {};
    playerOwneds[entityId] = {
      owningPlayerId: entityId,
    };

    cooldowns[entityId] = {
      shootCooldown: 3,
    };

    return entityId;
  }

  return {
    components,
    step,
    addPlayer,
  };
};
