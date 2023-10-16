import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { Ability } from "@/gameplay/components/abilities";

function abilityTeleport(
  entityId: string,
  target: pga.BladeE1 & pga.BladeE2,
  { bodies }: GameComponent
) {
  bodies[entityId].location = target;
}

function abilityShoot(
  entityId: string,
  target: pga.BladeE1 & pga.BladeE2,
  { bodies, lifetimes, projectiles, gameState }: GameComponent
) {
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

function handleUseAbilityOrder(entityId: string, components: GameComponent) {
  const { orders, abilities, gameState } = components;

  // Check if we have a use ability order
  const order = orders[entityId]?.order;
  if (order?.type !== "useAbility") {
    return;
  }

  // Remove the order
  orders[entityId].order = undefined;

  // Check if the ability exists
  const ability: Ability | undefined = abilities[entityId]?.[order.abilityId];
  if (!ability) {
    console.warn(
      "Tried to use ability",
      order,
      "which the entity does not have:",
      abilities[entityId]
    );
    return;
  }

  // Check if shoot is ready
  if (
    ability.lastUsedFrame !== undefined &&
    gameState.deltaTime * ability.lastUsedFrame + ability.cooldown >
      gameState.deltaTime * gameState.frameNumber
  ) {
    return;
  }

  // Set its last used frame for cooldown
  ability.lastUsedFrame = gameState.frameNumber;

  // Execute the order
  switch (ability.id) {
    case "shoot":
      abilityShoot(entityId, order.target, components);
      break;
    case "teleport":
      abilityTeleport(entityId, order.target, components);
      break;
    default:
      console.warn("Unhandled ability", ability);
      break;
  }
}

export const abilitySystem = (components: GameComponent) => {
  for (const entityId in components.orders) {
    handleUseAbilityOrder(entityId, components);
  }
};
