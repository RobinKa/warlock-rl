import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { dealDamage } from "@/gameplay/utils/damage";
import { AbilityDefinition } from "./definition";

export const scourgeDefinition: AbilityDefinition = {
  id: "scourge",
  onUse(entityId: number, components: GameComponent) {
    const scourgeDamage = 10;
    const scourgeRadius = 250;
    const scourgeScaleMin = 0.75;
    const scourgeScaleMax = 1;

    const { bodies, healths, units } = components;

    // Damage self
    if (entityId in healths) {
      healths[entityId].current = Math.max(
        1,
        healths[entityId].current - scourgeDamage
      );
    }

    if (!(entityId in bodies)) {
      return;
    }

    const body = bodies[entityId];

    // Damage others
    for (let otherEntityId in units) {
      // Skip self
      if (parseInt(otherEntityId) === entityId) {
        continue;
      }

      if (otherEntityId in bodies) {
        const otherBody = bodies[otherEntityId];

        const offset = pga.sub(otherBody.location, body.location);
        const distanceSq = pga.innerProduct(offset, offset).scalar;
        if (distanceSq <= scourgeRadius * scourgeRadius) {
          const distance = Math.sqrt(distanceSq);
          const knockbackDirection = pga.div(offset, distance);

          const alpha = distance / scourgeRadius;
          const knockbackMultiplier =
            (1 - alpha) * scourgeScaleMax + alpha * scourgeScaleMin;

          dealDamage(otherEntityId, components, {
            amount: scourgeDamage,
            knockbackDirection,
            knockbackMultiplier,
          });
        }
      }
    }
  },
};
