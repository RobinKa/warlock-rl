import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { createProjectile } from "@/gameplay/utils/projectile";
import { AbilityDefinition } from "./definition";

export const homingDefinition: AbilityDefinition = {
  id: "homing",
  onUseTarget(entityId, target, components) {
    createProjectile(entityId, target, components, {
      damage: 7,
      radius: 30,
      speed: 1000,
      lifetime: 4500 / 1000,
      homing: true,
    });
  },
  postMovement({ bodies, projectiles, playerOwneds, units }: GameComponent) {
    for (const [entityId, projectile] of Object.entries(projectiles)) {
      if (projectile.homing) {
        // Acquire new target
        // TODO: Check non-zero health
        if (projectile.homingTarget === undefined) {
          const playerOwned = playerOwneds[entityId];
          for (const [unitEntityId, unit] of Object.entries(units)) {
            const unitPlayerOwned = playerOwneds[unitEntityId];
            if (
              !unitPlayerOwned ||
              unitPlayerOwned.owningPlayerId !== playerOwned.owningPlayerId
            ) {
              projectile.homingTarget = unitEntityId;
              break;
            }
          }
        }

        // Home in on target
        if (projectile.homingTarget !== undefined) {
          const body = bodies[entityId];
          const otherBody = bodies[projectile.homingTarget];

          let toOther = pga.sub(otherBody.location, body.location);
          toOther = pga.div(
            toOther,
            Math.sqrt(pga.innerProduct(toOther, toOther).scalar)
          );

          // TODO: Take into account dt
          // TODO: Get speed from somewhere

          body.velocity = pga.add(
            pga.multiply(body.velocity, 0.97),
            pga.multiply(toOther, 800 * 0.04)
          );
        }
      }
    }
  },
};
