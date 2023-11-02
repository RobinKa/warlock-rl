import * as pga from "@/common/ga_zpp";
import { dealDamage } from "@/gameplay/damage";
import { createProjectile } from "@/gameplay/projectile";
import { areEnemies } from "@/gameplay/team";
import { AbilityDefinition } from "./definition";

const MAX_RANGE_SQ_PLAYER = Math.pow(550, 2);
const MAX_RANGE_SQ_PROJECTILE = Math.pow(600, 2);
const STRENGTH_PLAYER = 500;
const STRENGTH_PROJECTILE = 1650;

export const gravityDefinition: AbilityDefinition = {
  id: "gravity",
  onUseTarget(entityId, target, components) {
    createProjectile(entityId, target, components, {
      damage: 0,
      radius: 250,
      speed: 450,
      lifetime: 2,
      gravity: true,
      destroyedOnCollision: false,
      knockbackMultiplier: 0,
    });
  },
  preAbility(components) {
    const { bodies, projectiles, players, gameState } = components;

    for (const [entityId, projectile] of Object.entries(projectiles)) {
      const body = bodies[entityId];
      if (projectile.gravity && body) {
        for (const [otherEntityId, otherBody] of Object.entries(bodies)) {
          const isEnemy = areEnemies(
            parseInt(entityId),
            parseInt(otherEntityId),
            components
          );

          const isPlayer = otherEntityId in players;
          const isProjectile = otherEntityId in projectiles;

          const offset = pga.sub(body.location, otherBody.location);
          const distSq = pga.innerProduct(offset, offset).scalar;

          if (isPlayer && isEnemy && distSq < MAX_RANGE_SQ_PLAYER) {
            const direction = pga.div(
              offset,
              Math.max(1e-5, Math.sqrt(distSq))
            );
            otherBody.velocity = pga.add(
              otherBody.velocity,
              pga.multiply(
                direction,
                STRENGTH_PLAYER *
                  (1 - distSq / MAX_RANGE_SQ_PLAYER) *
                  gameState.deltaTime
              )
            );
          } else if (isProjectile && distSq < MAX_RANGE_SQ_PROJECTILE) {
            const direction = pga.div(
              offset,
              Math.max(1e-5, Math.sqrt(distSq))
            );
            otherBody.velocity = pga.add(
              otherBody.velocity,
              pga.multiply(
                direction,
                STRENGTH_PROJECTILE *
                  (1.5 - distSq / MAX_RANGE_SQ_PROJECTILE) *
                  gameState.deltaTime
              )
            );
          }
        }
      }
    }
  },
  postCollision(components) {
    const { detectedCollisions, projectiles, gameState } = components;

    for (const pair of Object.values(detectedCollisions.pairs)) {
      function handleGravity(id: number, otherId: number) {
        if (projectiles[id]?.gravity) {
          if (areEnemies(id, otherId, components)) {
            dealDamage(otherId, components, {
              amount: 2 * gameState.deltaTime,
            });
          }
          pair.handled = true;
        }
      }

      handleGravity(pair.idA, pair.idB);
      handleGravity(pair.idB, pair.idA);
    }
  },
};
