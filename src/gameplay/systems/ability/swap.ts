import { GameComponent } from "@/gameplay/components";
import { ProjectileComponent } from "@/gameplay/components/projectile";
import { createProjectile } from "@/gameplay/projectile";
import { AbilityDefinition } from "./definition";

type SwapProjectile = ProjectileComponent & {
  swap: true;
};

export const swapDefinition: AbilityDefinition = {
  id: "swap",
  onUseTarget(entityId, target, components) {
    createProjectile(entityId, target, components, {
      damage: 0,
      radius: 40,
      speed: 1983,
      lifetime: 0.4706,
      swap: true,
    });
  },
  postCollision(components: GameComponent) {
    const {
      detectedCollisions,
      playerOwneds,
      projectiles,
      bodies,
      lifetimes,
      units,
    } = components;
    for (const pair of detectedCollisions.pairs) {
      if (pair.handled) {
        continue;
      }

      function swapResponse(projectileId: number, otherId: number) {
        const projectile = projectiles[projectileId] as SwapProjectile;

        // Swap
        const projectileOwnerId = playerOwneds[projectileId]?.owningPlayerId;
        if (projectileOwnerId in bodies && otherId in bodies) {
          lifetimes[projectileId] = { remainingFrames: 0 };
          const projectileOwnerLocation = bodies[projectileOwnerId].location;
          const otherLocation = bodies[otherId].location;

          bodies[projectileOwnerId].location = otherLocation;
          bodies[otherId].location = projectileOwnerLocation;

          if (projectileOwnerId in units) {
            units[projectileOwnerId].location = otherLocation;
          }

          if (otherId in units) {
            units[otherId].location = projectileOwnerLocation;
          }

          projectile.swapped = true;
        }
      }

      if (pair.idA in projectiles && projectiles[pair.idA].swap) {
        swapResponse(pair.idA, pair.idB);
        pair.handled = true;
      } else if (pair.idB in projectiles && projectiles[pair.idB].swap) {
        swapResponse(pair.idB, pair.idA);
        pair.handled = true;
      }
    }
  },
  preAbility({ projectiles, lifetimes, playerOwneds, bodies }: GameComponent) {
    // Check if any swap projectile expired
    for (const [entityId, projectile] of Object.entries(projectiles)) {
      if (
        projectile.swap &&
        !projectile.swapped &&
        entityId in playerOwneds &&
        lifetimes[entityId]?.remainingFrames === 0
      ) {
        const projectileOwnerId = playerOwneds[entityId].owningPlayerId;
        if (projectileOwnerId in bodies && entityId in bodies) {
          bodies[projectileOwnerId].location = bodies[entityId].location;
        }
      }
    }
  },
};
