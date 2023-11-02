import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { dealDamage } from "@/gameplay/damage";
import { createProjectile } from "@/gameplay/projectile";
import { areDifferentOwners } from "@/gameplay/team";
import { AbilityDefinition } from "./definition";

export const linkDefinition: AbilityDefinition = {
  id: "link",
  onUseTarget(entityId, target, components) {
    createProjectile(entityId, target, components, {
      damage: 0,
      radius: 35,
      speed: 950,
      lifetime: 860 / 950,
      linkId: entityId,
    });
  },
  postCollision(components: GameComponent) {
    const { detectedCollisions, projectiles, pulls, lifetimes, units } =
      components;
    for (const pair of detectedCollisions.pairs) {
      if (pair.handled) {
        continue;
      }

      function linkResponse(projectileId: number, otherId: number) {
        // 1. Is link projectile
        // 2. Is unit
        // 3. Unit and projectile are owned by different players (but can be allies)
        const projectile = projectiles[projectileId];
        if (
          projectile?.linkId === undefined ||
          !(otherId in units) ||
          !areDifferentOwners(projectileId, otherId, components)
        ) {
          return false;
        }

        lifetimes[projectileId] = { remainingFrames: 0 };

        pulls[otherId] = {
          acceleration: 1550,
          minRange: 100,
          targetId: projectile.linkId,
        };

        return true;
      }

      if (
        linkResponse(pair.idA, pair.idB) ||
        linkResponse(pair.idB, pair.idA)
      ) {
        pair.handled = true;
      }
    }
  },
  postMovement(components) {
    const { pulls, bodies, shields, gameState } = components;
    for (const [entityId, pull] of Object.entries(pulls)) {
      const body = bodies[entityId];
      const otherBody = bodies[pull.targetId];

      // If either body doesn't exist anymore, or the target is shielded, stop.
      // TODO: Check if caster teleported or swapped to lava
      if (!body || !otherBody || pull.targetId in shields) {
        delete pulls[entityId];
        continue;
      }

      dealDamage(entityId, components, {
        amount: 12 * gameState.deltaTime,
      });

      const offset = pga.sub(otherBody.location, body.location);
      const distSq = pga.innerProduct(offset, offset).scalar;

      // If the bodies are close enough, stop
      if (distSq <= pull.minRange * pull.minRange) {
        delete pulls[entityId];
        continue;
      }

      const dist = Math.sqrt(distSq);
      const dir = dist > 0 ? pga.div(offset, dist) : { e1: 1, e2: 0 };

      // Apply acceleration
      body.velocity = pga.add(
        body.velocity,
        pga.multiply(dir, pull.acceleration * gameState.deltaTime)
      );
    }
  },
};
