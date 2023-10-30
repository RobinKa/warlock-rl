import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { areEnemies } from "../team";
import { AbilityDefinition } from "./definition";

export const shieldDefinition: AbilityDefinition = {
  id: "shield",
  onUse(entityId: number, components: GameComponent) {
    const shieldDuration = 1.2;

    const { shields, gameState } = components;

    shields[entityId] = {
      startFrame: gameState.frameNumber,
      duration: shieldDuration,
    };
  },
  postCollision(components: GameComponent) {
    const { detectedCollisions, playerOwneds, projectiles, bodies, shields } =
      components;
    for (const pair of detectedCollisions.pairs) {
      if (pair.handled) {
        continue;
      }

      function shieldResponse(
        shieldId: number | string,
        projectileId: number | string
      ) {
        // Change owner
        if (projectileId in playerOwneds && !projectiles[projectileId]?.swap) {
          // TODO: Consider player id != entity id
          playerOwneds[projectileId].owningPlayerId =
            typeof shieldId === "string" ? parseInt(shieldId) : shieldId;
        }

        // Set target to undefined so it gets reacquired to its new enemy
        const projectile = projectiles[projectileId];
        if (projectile?.homing) {
          projectile.homingTarget = undefined;
        }

        // TODO: Proper reflection along normal
        if (projectileId in bodies) {
          bodies[projectileId].velocity = pga.multiply(
            bodies[projectileId].velocity,
            -1
          );
        }
      }

      if (areEnemies(pair.idA, pair.idB, components)) {
        if (pair.idA in projectiles && pair.idB in shields) {
          shieldResponse(pair.idB, pair.idA);
          pair.handled = true;
        } else if (pair.idA in shields && pair.idB in projectiles) {
          shieldResponse(pair.idA, pair.idB);
          pair.handled = true;
        }
      }
    }
  },
  preAbility: ({ shields, gameState }: GameComponent) => {
    // Check if any shield expired
    for (const [entityId, shield] of Object.entries(shields)) {
      if (
        gameState.frameNumber * gameState.deltaTime >=
        shield.startFrame * gameState.deltaTime + shield.duration
      ) {
        delete shields[entityId];
      }
    }
  },
};
