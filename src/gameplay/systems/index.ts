import { System } from "@/common/systems";
import { GameComponent } from "../components";
import { abilitySystem } from "./ability";
import { collisionSystem } from "./collision";
import { gravitySystem } from "./gravity";
import { homingSystem } from "./homing";
import { lavaSystem } from "./lava";
import { lifetimeSystem } from "./lifetime";
import { movementSystem } from "./movement";
import { orderSystem } from "./order";
import { physicsSystem } from "./physics";
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
    homingSystem,
    gravitySystem,
    physicsSystem,
    lavaSystem,
    collisionSystem,
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
