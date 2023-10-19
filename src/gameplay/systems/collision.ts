import * as pga from "@/common/ga_zpp";
import { System } from "@/common/systems";
import { GameComponent } from "@/gameplay/components";
import { dealDamage } from "@/gameplay/damage";

export const collisionSystem: System<GameComponent> = (
  components: GameComponent
) => {
  const { bodies, projectiles, lifetimes } = components;

  function handleCollision(idA: string, idB: string) {
    if (idA in projectiles) {
      lifetimes[idA] = { remainingFrames: 0 };

      let knockbackDirection: (pga.BladeE1 & pga.BladeE2) | undefined =
        undefined;
      if (idA in bodies) {
        knockbackDirection = pga.div(
          bodies[idA].velocity,
          Math.sqrt(
            pga.innerProduct(bodies[idA].velocity, bodies[idA].velocity).scalar
          )
        );
      }

      dealDamage(idB, components, {
        amount: projectiles[idA].damage,
        knockbackDirection,
      });
    }
  }

  const entityIds = Object.keys(bodies);

  for (let i = 0; i < entityIds.length; i++) {
    for (let j = i + 1; j < entityIds.length; j++) {
      const idA = entityIds[i];
      const idB = entityIds[j];
      const bodyA = bodies[idA];
      const bodyB = bodies[idB];

      const diff = pga.sub(bodyA.location, bodyB.location);
      const distSq = pga.innerProduct(diff, diff).scalar;

      const combinedRadius = bodyA.radius + bodyB.radius;
      const combinedRadiusSq = Math.pow(combinedRadius, 2);

      if (distSq < combinedRadiusSq) {
        handleCollision(idA, idB);
        handleCollision(idB, idA);
      }
    }
  }
};
