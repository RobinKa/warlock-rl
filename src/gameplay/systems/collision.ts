import { EntityComponents } from "@/common/components";
import * as pga from "@/common/ga_zpp";
import { System } from "@/common/systems";
import { BodyComponent } from "@/gameplay/components/body";
import { HealthComponent } from "@/gameplay/components/health";
import { LifetimeComponent } from "@/gameplay/components/lifetime";
import { ProjectileComponent } from "@/gameplay/components/projectile";

export type CollisionSystemInputs = {
  bodies: EntityComponents<BodyComponent>;
  healths: EntityComponents<HealthComponent>;
  projectiles: EntityComponents<ProjectileComponent>;
  lifetimes: EntityComponents<LifetimeComponent>;
};

export const collisionSystem: System<CollisionSystemInputs> = ({
  bodies,
  projectiles,
  lifetimes,
  healths,
}: CollisionSystemInputs) => {
  function handleCollision(idA: string, idB: string) {
    if (idA in projectiles) {
      lifetimes[idA] = { remainingFrames: 0 };
      if (idB in healths) {
        healths[idB].current = Math.max(
          0,
          healths[idB].current - projectiles[idA].damage
        );
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
