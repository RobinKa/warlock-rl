import { GameComponent } from "@/gameplay/components";
import { Ability } from "@/gameplay/components/abilities";
import { GameStateComponent } from "@/gameplay/components/gamestate";
import { OrderUseAbility } from "@/gameplay/components/order";
import { UnitComponent } from "@/gameplay/components/unit";

function canSetUnitState(unit: UnitComponent): boolean {
  return unit.state.type !== "casting";
}

function isAbilityReady(
  ability: Ability,
  gameState: GameStateComponent
): boolean {
  return (
    ability.lastUsedFrame === undefined ||
    gameState.deltaTime * ability.lastUsedFrame + ability.cooldown <=
      gameState.deltaTime * gameState.frameNumber
  );
}

function canUseAbility(
  entityId: number | string,
  castOrder: OrderUseAbility,
  { abilities, gameState }: GameComponent
): boolean {
  const ability: Ability | undefined =
    abilities[entityId]?.[castOrder.abilityId];

  if (!ability) {
    console.warn(
      "Tried to use ability",
      castOrder,
      "which the entity does not have:",
      abilities[entityId]
    );
    return false;
  }

  // Check if ability is ready
  return isAbilityReady(ability, gameState);
}

export function orderSystem(components: GameComponent) {
  const { orders, units, healths, gameState } = components;

  for (const [entityId, order] of Object.entries(orders)) {
    if (entityId in units && healths[entityId]?.current > 0) {
      if (order.order) {
        const unit = units[entityId];

        // Maybe set unit state from order
        switch (order.order.type) {
          case "move":
            if (canSetUnitState(unit)) {
              unit.state = {
                type: "moving",
                target: order.order.target,
              };
            }
            break;
          case "useAbility":
            if (
              canSetUnitState(unit) &&
              canUseAbility(entityId, order.order, components)
            ) {
              unit.state = {
                type: "casting",
                castOrder: order.order,
                startFrame: gameState.frameNumber,
              };
            }
            break;
          case "stop":
            unit.state = {
              type: "idle",
            };
            break;
          default:
            throw new Error(`Unhandled order: ${order.order}`);
        }

        order.order = undefined;
      }
    }
  }
}
