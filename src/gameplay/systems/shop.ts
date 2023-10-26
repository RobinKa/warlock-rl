import { getAbilityDefaults } from "@/gameplay/abilities";
import { GameComponent } from "@/gameplay/components";

export function shopSystem({ shops, abilities, gameState }: GameComponent) {
  if (gameState.state.type !== "shop") {
    return;
  }

  // Process shop orders
  for (const [playerId, shop] of Object.entries(shops)) {
    for (const order of shop.orders) {
      switch (order.type) {
        case "buyAbility":
          const playerAbilities = abilities[playerId];
          if (!playerAbilities) {
            throw new Error(
              `Player ${playerId} does not have abilities: ${abilities}`
            );
          }

          const abilityDefault = getAbilityDefaults()[order.abilityId];
          if (!abilityDefault) {
            throw new Error(`No ability default for ${order.abilityId}`);
          }

          // Check if the ability is available to buy and
          // that we have enough gold.
          const cost = shop.costs[order.abilityId];
          if (!cost || cost > shop.gold) {
            continue;
          }

          if (!(order.abilityId in abilities)) {
            // Add the ability
            shop.gold -= cost;
            playerAbilities[order.abilityId] = abilityDefault;
          } else {
            // TODO: Upgrade ability
          }
          break;
        default:
          throw new Error(`Unhandled shop order: ${order}`);
      }
    }

    shop.orders.length = 0;
  }
}
