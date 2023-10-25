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
    gameEvents: {
      events: [],
    },
    arena: {
      radius: 32 * 15, //20, (13 + 1 per player)
      lavaDamage: 10,
      nextShrinkTime: 10,
      shrinkInterval: 10,
      shrinkRadius: 32,
    },
    bodies: {},
    healths: {},
    lifetimes: {},
    playerOwneds: {},
    projectiles: {},
    orders: {},
    abilities: {},
    units: {},
    shields: {},
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

  function addPlayer(): number {
    const {
      gameState,
      bodies,
      units,
      healths,
      orders,
      playerOwneds,
      abilities,
    } = components;

    const entityId = gameState.nextEntityId++;

    const location = {
      e1: randomFloat() * 500 - 250,
      e2: randomFloat() * 500 - 250,
    };

    bodies[entityId] = {
      location: location,
      velocity: { e1: 0, e2: 0 },
      force: { e1: 0, e2: 0 },
      facing: 0,
      turnRate: 1.2 / 0.03, // Turn rate is radians per 0.03 seconds
      radius: 30,
      dampening: 0.96,
      mass: 100,
    };

    units[entityId] = {
      state: { type: "idle" },
      knockbackMultiplier: 1,
      healthRegeneration: 0.5,
      location: { e1: 0, e2: 0 },
      walkVelocity: { e1: 0, e2: 0 },
    };

    healths[entityId] = {
      current: 100,
      maximum: 100,
    };

    orders[entityId] = {};
    playerOwneds[entityId] = {
      owningPlayerId: entityId,
    };

    abilities[entityId] = {
      shoot: {
        id: "shoot",
        target: "point",
        cooldown: 3,
        castTime: 0.2,
      },
      teleport: {
        id: "teleport",
        target: "point",
        cooldown: 16,
      },
      swap: {
        id: "swap",
        target: "point",
        cooldown: 15.8,
      },
      homing: {
        id: "homing",
        target: "point",
        cooldown: 15,
        castTime: 0.2,
      },
      scourge: {
        id: "scourge",
        target: "none",
        cooldown: 3,
        castTime: 0.9,
      },
      shield: {
        id: "shield",
        target: "none",
        cooldown: 14,
      },
    };

    return entityId;
  }

  function addPillar(): number {
    const { gameState, bodies, healths } = components;

    const entityId = gameState.nextEntityId++;

    const location = {
      e1: randomFloat() * 500 - 250,
      e2: randomFloat() * 500 - 250,
    };

    bodies[entityId] = {
      location: location,
      velocity: { e1: 0, e2: 0 },
      force: { e1: 0, e2: 0 },
      facing: 0,
      turnRate: 0,
      radius: 60,
      mass: 10_000,
      static: true,
    };

    healths[entityId] = {
      current: 30,
      maximum: 30,
    };

    return entityId;
  }

  return {
    components,
    step,
    addPlayer,
    addPillar,
    randomInt,
    randomRange,
    randomFloat,
  };
};
