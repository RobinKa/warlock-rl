import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { dealDamage } from "@/gameplay/damage";

export const lavaSystem = (components: GameComponent) => {
  const { healths, bodies, units, arena, gameState } = components;
  const damage = arena.lavaDamage * gameState.deltaTime;
  const time = gameState.deltaTime * gameState.frameNumber;
  if (time >= arena.nextShrinkTime) {
    arena.nextShrinkTime += arena.shrinkInterval;
    arena.radius = Math.max(0, arena.radius - arena.shrinkRadius);
  }

  for (const entityId in healths) {
    if (entityId in bodies) {
      const radiusSquared = pga.innerProduct(
        bodies[entityId].location,
        bodies[entityId].location
      ).scalar;

      if (radiusSquared > arena.radius * arena.radius) {
        dealDamage(entityId, components, {
          amount: damage,
          knockbackMultiplierIncreaseMultiplier: 0.5,
        });
      }
    }
  }
};
