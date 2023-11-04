import { GameComponent } from "@/gameplay/components";
import { AbilityId } from "@/gameplay/components/abilities";

export function buyAbility(
  entityId: number,
  abilityId: AbilityId,
  { shops }: GameComponent
) {
  const shop = shops[entityId];
  if (!shop) {
    throw new Error(`No shop found for ${entityId}: ${shops}`);
  }

  shop.orders.push({
    type: "buyAbility",
    abilityId,
  });
}
