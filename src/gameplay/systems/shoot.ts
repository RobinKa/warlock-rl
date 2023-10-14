import * as pga from "@/common/ga_zpp";
import { GameComponent } from "../components";

export const shootSystem = ({
  orders,
  bodies,
  lifetimes,
  projectiles,
  gameState,
}: GameComponent) => {
  for (const [entityId, order] of Object.entries(orders)) {
    if (order.order?.type === "shoot" && entityId in bodies) {
      const bodyLocation = bodies[entityId].location;
      const bodyLocationToTarget = pga.sub(order.order.target, bodyLocation);
      const distance = Math.sqrt(
        pga.innerProduct(bodyLocationToTarget, bodyLocationToTarget).scalar
      );
      const direction = pga.div(bodyLocationToTarget, distance);

      const location = pga.add(bodyLocation, pga.multiply(direction, 50));
      const velocity = pga.multiply(direction, 700);

      const projectileEntityId = gameState.nextEntityId++;
      lifetimes[projectileEntityId] = {
        remainingFrames: 3 / gameState.deltaTime,
      };

      bodies[projectileEntityId] = {
        location,
        velocity,
        force: { e1: 0, e2: 0 },
        radius: 10,
      };

      projectiles[projectileEntityId] = {
        damage: 10,
      };

      order.order = undefined;
    }
  }
};
