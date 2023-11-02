import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { dealDamage } from "@/gameplay/damage";
import { areEnemies } from "../team";

export function projectileCollisionSystem(components: GameComponent) {
  const { detectedCollisions, projectiles, lifetimes } = components;

  for (const pair of detectedCollisions.pairs) {
    if (pair.handled) {
      continue;
    }

    function projectileResponse(projectileId: number, otherId: number) {
      const projectile = projectiles[projectileId];
      // Generic projectile
      if (projectile.destroyedOnCollision !== false) {
        lifetimes[projectileId] = { remainingFrames: 0 };
      }

      dealDamage(otherId, components, {
        amount: projectile.damage,
        knockbackDirection: pair.normal
          ? pga.multiply(pair.normal, -1)
          : undefined,
        knockbackMultiplier: projectile.knockbackMultiplier,
      });
    }

    // Projectile-Any damage and knockback
    if (areEnemies(pair.idA, pair.idB, components)) {
      if (pair.idA in projectiles) {
        projectileResponse(pair.idA, pair.idB);
        pair.handled = true;
      }
      if (pair.idB in projectiles) {
        projectileResponse(pair.idB, pair.idA);
        pair.handled = true;
      }
    }
  }
}
