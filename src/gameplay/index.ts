import { getAbilityDefaults } from "./abilities";
import { getDefaultArena } from "./arena";
import { GameComponent } from "./components";
import { AbilityId } from "./components/abilities";
import { randomFloat } from "./random";
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
      nextEntityId: 1_000,
      randomState: seed,
      goldPerRound: 10,
      shopTime: 15,
      state: {
        type: "shop",
        startFrame: 0,
        duration: 30,
      },
      round: 0,
    },
    gameEvents: {
      events: [],
    },
    arena: getDefaultArena(),
    players: {},
    bodies: {},
    healths: {},
    lifetimes: {},
    playerOwneds: {},
    projectiles: {},
    orders: {},
    abilities: {},
    units: {},
    shields: {},
    shops: {},
    detectedCollisions: {
      pairs: [],
    },
  };

  function step() {
    gameSystem(components);
  }

  function addPlayer(): number {
    const {
      gameState,
      players,
      shops,
      bodies,
      units,
      healths,
      orders,
      playerOwneds,
      abilities,
    } = components;

    const entityId = gameState.nextEntityId++;

    players[entityId] = { ready: false };

    shops[entityId] = {
      gold: 20,
      costs: {
        shoot: 5,
        scourge: 10,
        teleport: 12,
        swap: 11,
        homing: 11,
        shield: 12,
        cluster: 14,
        gravity: 12,
      },
      orders: [],
    };

    const location = {
      e1: randomFloat(components) * 500 - 250,
      e2: randomFloat(components) * 500 - 250,
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
      moveSpeed: 210,
    };

    healths[entityId] = {
      current: 100,
      maximum: 100,
    };

    orders[entityId] = {};
    playerOwneds[entityId] = {
      owningPlayerId: entityId,
    };

    const starterAbilities: Set<AbilityId> = new Set(["scourge", "shoot"]);
    abilities[entityId] = Object.fromEntries(
      Object.entries(getAbilityDefaults()).filter(([abilityId, ability]) =>
        starterAbilities.has(abilityId as AbilityId)
      )
    );

    return entityId;
  }

  function addPillar(): number {
    const { gameState, bodies, healths } = components;

    const entityId = gameState.nextEntityId++;

    const location = {
      e1: randomFloat(components) * 500 - 250,
      e2: randomFloat(components) * 500 - 250,
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
  };
};
