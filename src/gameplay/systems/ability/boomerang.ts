import * as pga from "@/common/ga_zpp";
import { getDistanceSquared, normalized, reflect } from "@/common/mathutils";
import { dealDamage } from "@/gameplay/damage";
import { createProjectile } from "@/gameplay/projectile";
import { areEnemies } from "@/gameplay/team";
import { AbilityDefinition } from "./definition";

export const boomerangDefinition: AbilityDefinition = {
  id: "boomerang",
  onUseTarget(entityId, target, components) {
    createProjectile(entityId, target, components, {
      damage: 7,
      radius: 38,
      speed: 1500, // unused
      boomerang: true,
      destroyedOnCollision: false, // unused
      knockbackMultiplier: 0, // unused
    });
  },
  postMovement({ lifetimes, projectiles, bodies, playerOwneds, gameState }) {
    const gameTime = gameState.deltaTime * gameState.frameNumber;

    for (const [entityId, projectile] of Object.entries(projectiles)) {
      if (projectile.boomerang) {
        const body = bodies[entityId];

        body.velocity = pga.add(
          body.velocity,
          pga.multiply(projectile.acceleration, gameState.deltaTime)
        );
        switch (projectile.state) {
          case "initial":
            if (gameTime >= projectile.changeAccelerationTime) {
              projectile.acceleration = projectile.changedAcceleration;
              projectile.state = "changed";
            }
            break;
          case "changed":
            if (gameTime >= projectile.stopAccelerationTime) {
              projectile.acceleration = { e1: 0, e2: 0 };
              projectile.state = "stopped";
            }
            break;
          case "stopped":
            // Check if the boomerang is close to the owner and should disappear
            const ownerBody = bodies[playerOwneds[entityId].owningPlayerId];
            if (
              !ownerBody ||
              getDistanceSquared(body.location, ownerBody.location) <
                Math.pow(75, 2)
            ) {
              lifetimes[entityId] = {
                remainingFrames: 0,
              };
              continue;
            }

            // Movement
            const velocityChange = pga.multiply(
              normalized(
                pga.sub(
                  pga.multiply(
                    normalized(pga.sub(ownerBody.location, body.location)),
                    1000
                  ),
                  body.velocity
                )
              ),
              1000 * gameState.deltaTime
            );
            body.velocity = pga.add(body.velocity, velocityChange);
            break;
        }
      }
    }
  },
  postCollision(components) {
    const { detectedCollisions, projectiles, units, bodies, gameState } =
      components;

    for (const pair of Object.values(detectedCollisions.pairs)) {
      function handleBoomerang(id: number, otherId: number) {
        const projectile = projectiles[id];
        if (projectile?.boomerang) {
          pair.handled = true;

          if (otherId in units && areEnemies(id, otherId, components)) {
            const normal =
              id === pair.idA ? pair.normal : pga.multiply(pair.normal, -1);
            dealDamage(otherId, components, {
              amount: projectile.damage,
              knockbackMultiplier: 0.95,
              knockbackDirection: normal,
            });

            const body = bodies[id];
            const otherBody = bodies[otherId];
            if (pga.innerProduct(normal, body.velocity).scalar > 0) {
              // Reflect velocity
              body.velocity = pga.multiply(
                normalized(reflect(body.velocity, normal)),
                500
              );

              // Move projectile out of unit
              const distanceDeficit =
                body.radius + otherBody.radius + 10 - pair.distance;
              if (distanceDeficit > 0) {
                body.location = pga.sub(
                  body.location,
                  pga.multiply(normal, -distanceDeficit)
                );
              }
            }

            // Put boomerang into its final state without acceleration
            projectile.state = "stopped";
            projectile.acceleration = {
              e1: 0,
              e2: 0,
            };
          }
        }
      }

      handleBoomerang(pair.idA, pair.idB);
      handleBoomerang(pair.idB, pair.idA);
    }
  },
};
