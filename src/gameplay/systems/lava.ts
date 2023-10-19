import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";

export const lavaSystem = ({
  healths,
  bodies,
  units,
  arena,
  gameState,
}: GameComponent) => {
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
        healths[entityId].current = Math.max(
          0,
          healths[entityId].current - damage
        );

        if (entityId in units) {
          units[entityId].knockbackMultiplier += (0.5 * damage) / 100;
        }
      }
    }
  }
};
