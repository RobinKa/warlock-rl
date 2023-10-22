import * as pga from "@/common/ga_zpp";
import { System } from "@/common/systems";
import { GameComponent } from "@/gameplay/components";
import { dealDamage } from "@/gameplay/damage";
import { addImpulse } from "../physics";

export const collisionSystem: System<GameComponent> = (
  components: GameComponent
) => {
  const { bodies, projectiles, units, lifetimes } = components;

  function handleCollision(idA: string, idB: string) {
    let normal: (pga.BladeE1 & pga.BladeE2) | undefined = undefined;
    if (idA in bodies && idB in bodies) {
      const bodyA = bodies[idA];
      const bodyB = bodies[idB];
      const aToB = pga.sub(bodies[idB].location, bodies[idA].location);
      const distSq = pga.innerProduct(aToB, aToB).scalar;

      if (distSq > 0) {
        normal = pga.div(aToB, Math.sqrt(distSq));
      } else {
        normal = { e1: 1, e2: 0 };
      }

      const radius = bodyA.radius + bodyB.radius;
      const r = distSq - radius * radius;
      if (r < 0) {
        // Unit-Unit pushback
        if (idA in units && idB in units) {
          let s = Math.sqrt(-r);
          if (s < 30) {
            s = 30;
          }
          const displacement = pga.div(aToB, s);
          bodyA.location = pga.sub(bodyA.location, displacement);
          bodyB.location = pga.add(bodyB.location, displacement);
        }
      } else {
        const momentumTowards =
          (bodyA.mass ?? 0) * pga.innerProduct(bodyA.velocity, normal).scalar -
          (bodyB.mass ?? 0) * pga.innerProduct(bodyB.velocity, normal).scalar;

        // Ellastic collision
        if (momentumTowards > 0) {
          addImpulse(
            idA,
            components,
            pga.multiply(normal, -0.5 * momentumTowards)
          );
          addImpulse(
            idB,
            components,
            pga.multiply(normal, 0.5 * momentumTowards)
          );
        }
      }
    }

    // Projectile-Any damage and knockback
    if (idA in projectiles) {
      lifetimes[idA] = { remainingFrames: 0 };
      dealDamage(idB, components, {
        amount: projectiles[idA].damage,
        knockbackDirection: normal,
      });
    }
    if (idB in projectiles) {
      lifetimes[idB] = { remainingFrames: 0 };
      dealDamage(idA, components, {
        amount: projectiles[idB].damage,
        knockbackDirection: normal,
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
        // handleCollision(idB, idA);
      }
    }
  }
};
