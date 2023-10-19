import { System } from "@/common/systems";
import { GameComponent } from "../components";
import { abilitySystem } from "./ability";
import { collisionSystem } from "./collision";
import { lavaSystem } from "./lava";
import { lifetimeSystem } from "./lifetime";
import { movementSystem } from "./movement";
import { orderSystem } from "./order";
import { physicsSystem } from "./physics";

export const gameSystem: System<GameComponent> = (
  components: GameComponent
) => {
  const systems: System<GameComponent>[] = [
    orderSystem,
    abilitySystem,
    movementSystem,
    physicsSystem,
    lavaSystem,
    collisionSystem,
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
