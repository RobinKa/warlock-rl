import * as pga from "@/common/ga_zpp";
import { normalized, rotate } from "@/common/mathutils";
import { dealDamage } from "@/gameplay/damage";
import { areEnemies } from "@/gameplay/team";
import { AbilityDefinition } from "./definition";

const range = 600;
const radius = 25;
const damage = 7;
const knockbackMultiplier = 0.92;

export const lightningDefinition: AbilityDefinition = {
  id: "lightning",
  onUseTarget(entityId, target, components) {
    const casterLocation = components.bodies[entityId].location;
    const direction = normalized(pga.sub(target, casterLocation));
    const normalDirection = rotate(direction, Math.PI / 2);

    const best: { distance: number; id: string | undefined } = {
      distance: range,
      id: undefined,
    };

    // Find closest target on the line
    for (const [otherId, body] of Object.entries(components.bodies)) {
      // TODO: Lightning-Fireball combo
      if (areEnemies(entityId, parseInt(otherId), components)) {
        const offset = pga.sub(body.location, casterLocation);
        const normalDistance = Math.abs(
          pga.innerProduct(offset, normalDirection).scalar
        );
        const combinedRadius = radius + body.radius;

        if (normalDistance <= combinedRadius) {
          const signedDistance = pga.innerProduct(offset, direction).scalar;

          if (signedDistance >= 0 && signedDistance <= best.distance) {
            best.distance = signedDistance;
            best.id = otherId;
          }
        }
      }
    }

    // Deal damage if we found a target
    if (best.id !== undefined) {
      dealDamage(best.id, components, {
        amount: damage,
        knockbackDirection: direction,
        knockbackMultiplier,
      });
    }
  },
};
