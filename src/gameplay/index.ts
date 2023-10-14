import * as pga from "@/common/ga_zpp";
import { GameComponent } from "./components";
import { gameSystem } from "./systems";

export type MakeGameOptions = {
  deltaTime: number;
  seed: number;
};

export const makeGame = ({ deltaTime, seed }: MakeGameOptions) => {
  const components: GameComponent = {
    gameState: {
      deltaTime,
      frameNumber: 0,
      moveSpeed: 210,
      nextEntityId: 1_000,
      randomState: seed,
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

  function randomInt() {
    let t = (components.gameState.randomState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  function randomRange(min: number, max: number) {
    return min + (randomInt() % (max - min));
  }

  function randomFloat() {
    return randomInt() / 4294967296;
  }

  function addPlayer(
    location: pga.BladeE1 & pga.BladeE2,
    withVelocity: boolean
  ): number {
    const { gameState, bodies, healths, orders, playerOwneds, cooldowns } =
      components;

    const entityId = gameState.nextEntityId++;

    location = {
      e1: (randomFloat() - 0.5) * 500,
      e2: (randomFloat() - 0.5) * 500,
    };

    bodies[entityId] = {
      location: location,
      velocity: withVelocity
        ? {
            e1: (randomFloat() - 0.5) * 500,
            e2: (randomFloat() - 0.5) * 500,
          }
        : { e1: 0, e2: 0 },
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
      shootCooldown: 2,
    };

    return entityId;
  }

  return {
    components,
    step,
    addPlayer,
    randomInt,
    randomRange,
    randomFloat,
  };
};
