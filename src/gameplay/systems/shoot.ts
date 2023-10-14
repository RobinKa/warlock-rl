import * as pga from "@/common/ga_zpp";
import { GameComponent } from "../components";

export const shootSystem = ({
  orders,
  bodies,
  lifetimes,
  projectiles,
  gameState,
  cooldowns,
}: GameComponent) => {
  const elapsedTime = gameState.deltaTime * gameState.frameNumber;

  for (const [entityId, order] of Object.entries(orders)) {
    if (
      order.order?.type === "shoot" &&
      entityId in bodies &&
      entityId in cooldowns
    ) {
      const { target } = order.order;
      order.order = undefined;

      // Check if shoot is ready
      const cooldown = cooldowns[entityId];
      if (
        cooldown.lastShootFrame !== undefined &&
        gameState.deltaTime * cooldown.lastShootFrame + cooldown.shootCooldown >
          elapsedTime
      ) {
        continue;
      }
      cooldown.lastShootFrame = gameState.frameNumber;

      // Spawn projectile
      const bodyLocation = bodies[entityId].location;
      const bodyLocationToTarget = pga.sub(target, bodyLocation);
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
    }
  }
};
