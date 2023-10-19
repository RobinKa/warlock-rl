import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";

export type DealDamageOptions = {
  amount: number;
  knockbackMultiplier?: number;
  knockbackDirection?: pga.BladeE1 & pga.BladeE2;
  knockbackMultiplierIncreaseMultiplier?: number;
};

export function dealDamage(
  entityId: number | string,
  { units, bodies, healths }: GameComponent,
  {
    amount,
    knockbackMultiplier,
    knockbackDirection,
    knockbackMultiplierIncreaseMultiplier,
  }: DealDamageOptions
) {
  if (knockbackDirection && entityId in bodies) {
    knockbackMultiplier ??= 1;
    knockbackMultiplier *= 100;
    knockbackMultiplier *= amount <= 10 ? amount : Math.sqrt(10 * amount);

    if (entityId in units) {
      knockbackMultiplier *= units[entityId].knockbackMultiplier;
    }

    const kb = pga.multiply(knockbackDirection, knockbackMultiplier);

    bodies[entityId].velocity = pga.add(bodies[entityId].velocity, kb);
  }

  if (entityId in units) {
    units[entityId].knockbackMultiplier +=
      ((knockbackMultiplierIncreaseMultiplier ?? 1) * amount) / 100;
  }

  if (entityId in healths) {
    healths[entityId].current = Math.max(0, healths[entityId].current - amount);
  }
}
