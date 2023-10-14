import { EntityComponents, SingletonComponent } from "@/common/components";
import * as pga from "@/common/ga_zpp";
import { OrderComponent } from "@/gameplay/components/order";
import { BodyComponent } from "../components/body";
import { GameStateComponent } from "../components/gamestate";

export type MovementSystemInputs = {
  bodies: EntityComponents<BodyComponent>;
  orders: EntityComponents<OrderComponent>;
  gameState: SingletonComponent<GameStateComponent>;
};

export const movementSystem = ({
  bodies,
  orders,
  gameState,
}: MovementSystemInputs) => {
  for (const [entityId, order] of Object.entries(orders)) {
    if (order.order && entityId in bodies) {
      const body = bodies[entityId];

      switch (order.order.type) {
        case "move":
          const bodyToTarget = pga.sub(order.order.target, body.location);
          const dstSq = pga.innerProduct(bodyToTarget, bodyToTarget).scalar;
          const dstPerFrame = gameState.moveSpeed * gameState.deltaTime;

          if (dstSq <= dstPerFrame * dstPerFrame) {
            body.location = order.order.target;
            order.order = undefined;
          } else {
            const direction = pga.div(bodyToTarget, Math.sqrt(dstSq));
            body.location = pga.add(
              body.location,
              pga.multiply(direction, dstPerFrame)
            );
          }
          break;
      }
    }
  }
};
