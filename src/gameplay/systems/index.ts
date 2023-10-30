import { System } from "@/common/systems";
import { GameComponent } from "../components";
import {
  abilityCollisionSystem,
  abilityMovementSystem,
  abilitySystem,
} from "./ability";
import { bodyCollisionSystem } from "./bodycollision";
import { collisionDetectionSystem } from "./collisiondetection";
import { lavaSystem } from "./lava";
import { lifetimeSystem } from "./lifetime";
import { movementSystem } from "./movement";
import { orderSystem } from "./order";
import { physicsSystem } from "./physics";
import { projectileCollisionSystem } from "./projectilecollision";
import { roundSystem } from "./round";
import { shopSystem } from "./shop";

export const gameSystem: System<GameComponent> = (
  components: GameComponent
) => {
  components.gameEvents.events.length = 0;

  const systems: System<GameComponent>[] = [
    shopSystem,
    orderSystem,
    abilitySystem,
    movementSystem,
    abilityMovementSystem,
    physicsSystem,
    lavaSystem,
    collisionDetectionSystem,
    bodyCollisionSystem,
    abilityCollisionSystem,
    projectileCollisionSystem,
    roundSystem,
    lifetimeSystem,
  ];

  // TODO: Move to system
  for (const [entityId, unit] of Object.entries(components.units)) {
    if (entityId in components.healths) {
      const health = components.healths[entityId];
      health.current = Math.min(
        health.maximum,
        health.current +
          unit.healthRegeneration * components.gameState.deltaTime
      );
    }
  }

  systems.forEach((system) => system(components));

  components.gameState.frameNumber++;
};
