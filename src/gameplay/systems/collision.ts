import * as pga from "@/common/ga_zpp";
import { System } from "@/common/systems";
import { GameComponent } from "@/gameplay/components";

export const collisionSystem: System<GameComponent> = ({
  bodies,
  projectiles,
  lifetimes,
  healths,
  units,
}: GameComponent) => {
  function handleCollision(idA: string, idB: string) {
    if (idA in projectiles) {
      lifetimes[idA] = { remainingFrames: 0 };
      if (idB in healths) {
        healths[idB].current = Math.max(
          0,
          healths[idB].current - projectiles[idA].damage
        );
      }

      // Conserve momentum
      if (idA in bodies && idB in bodies) {
        let knockbackFactor = 10;

        // More damage is more knockback, smaller slope when damage is high
        knockbackFactor *=
          projectiles[idA].damage <= 10
            ? projectiles[idA].damage
            : Math.sqrt(10 * projectiles[idA].damage);

        // Knockback multiplier from victim
        if (idB in units) {
          knockbackFactor *= units[idB].knockbackMultiplier;
          units[idB].knockbackMultiplier += projectiles[idA].damage / 100;
        }

        // TODO: Velocity along hit normal
        // TODO: Use mass
        const speed = Math.sqrt(
          pga.innerProduct(bodies[idA].velocity, bodies[idA].velocity).scalar
        );
        const direction = pga.div(bodies[idA].velocity, speed);

        // Apply knockback
        const knockback = pga.multiply(direction, knockbackFactor);
        bodies[idB].velocity = pga.add(bodies[idB].velocity, knockback);
      }
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
