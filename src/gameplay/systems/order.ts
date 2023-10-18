import { GameComponent } from "@/gameplay/components";
import { UnitComponent } from "@/gameplay/components/unit";

function canSetUnitState(unit: UnitComponent): boolean {
  return unit.state.type !== "casting";
}

export function orderSystem({ orders, units }: GameComponent) {
  for (const [entityId, order] of Object.entries(orders)) {
    if (entityId in units) {
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
            if (canSetUnitState(unit)) {
              unit.state = {
                type: "casting",
                castOrder: order.order,
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
