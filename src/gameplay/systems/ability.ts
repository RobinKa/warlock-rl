import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { Ability } from "@/gameplay/components/abilities";
import { GameStateComponent } from "@/gameplay/components/gamestate";
import { OrderUseAbility } from "@/gameplay/components/order";
import { turnToTarget } from "@/gameplay/systems/movement";

export function isAbilityReady(
  ability: Ability,
  gameState: GameStateComponent
): boolean {
  return (
    ability.lastUsedFrame === undefined ||
    gameState.deltaTime * ability.lastUsedFrame + ability.cooldown <=
      gameState.deltaTime * gameState.frameNumber
  );
}

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
  const velocity = pga.multiply(direction, 1000);

  const projectileEntityId = gameState.nextEntityId++;
  lifetimes[projectileEntityId] = {
    remainingFrames: 3 / gameState.deltaTime,
  };

  bodies[projectileEntityId] = {
    location,
    velocity,
    force: { e1: 0, e2: 0 },
    radius: 25,
    facing: 0,
    turnRate: 0,
  };

  projectiles[projectileEntityId] = {
    damage: 7,
  };
}

function abilityScourge(
  entityId: string,
  { bodies, healths, units }: GameComponent
) {
  const scourgeDamage = 10;
  const scourgeRadius = 250;
  const scourgeScaleMin = 0.75;
  const scourgeScaleMax = 1;

  if (entityId in healths) {
    healths[entityId].current = Math.max(
      1,
      healths[entityId].current - scourgeDamage
    );
  }

  if (!(entityId in bodies)) {
    return;
  }

  const body = bodies[entityId];

  for (let otherEntityId in units) {
    // Skip self
    if (otherEntityId === entityId) {
      continue;
    }

    if (otherEntityId in healths) {
      healths[otherEntityId].current = Math.max(
        0,
        healths[otherEntityId].current - scourgeDamage
      );
    }

    if (otherEntityId in bodies) {
      const otherBody = bodies[otherEntityId];

      const offset = pga.sub(otherBody.location, body.location);
      const distanceSq = pga.innerProduct(offset, offset).scalar;
      if (distanceSq <= scourgeRadius * scourgeRadius) {
        const distance = Math.sqrt(distanceSq);

        const alpha = distance / scourgeRadius;
        let kbFactor = alpha * scourgeScaleMax + (1 - alpha) * scourgeScaleMin;

        kbFactor *= 10 * scourgeDamage;

        if (otherEntityId in units) {
          kbFactor *= units[otherEntityId].knockbackMultiplier;
          units[otherEntityId].knockbackMultiplier += scourgeDamage / 100;
        }

        const direction = pga.div(offset, distance);
        const kb = pga.multiply(direction, kbFactor);

        otherBody.velocity = pga.add(otherBody.velocity, kb);
      }
    }
  }
}

function useAbility(
  entityId: string,
  ability: Ability,
  castOrder: OrderUseAbility,
  components: GameComponent
) {
  const { gameState } = components;

  // Set its last used frame for cooldown
  ability.lastUsedFrame = gameState.frameNumber;

  // Execute the order
  switch (ability.id) {
    case "scourge":
      abilityScourge(entityId, components);
      break;
    case "shoot":
      abilityShoot(entityId, castOrder.target, components);
      break;
    case "teleport":
      abilityTeleport(entityId, castOrder.target, components);
      break;
    default:
      console.warn("Unhandled ability", ability);
      break;
  }
}

export const abilitySystem = (components: GameComponent) => {
  const { units, bodies, abilities, gameState } = components;
  for (const [entityId, unit] of Object.entries(units)) {
    if (entityId in bodies) {
      const body = bodies[entityId];

      if (unit.state.type === "casting") {
        const { castOrder } = unit.state;

        // Check if the ability exists
        const ability: Ability | undefined =
          abilities[entityId]?.[castOrder.abilityId];
        if (!ability) {
          console.warn(
            "Tried to use ability",
            castOrder,
            "which the entity does not have:",
            abilities[entityId]
          );
          continue;
        }

        // Check if ability is ready
        if (!isAbilityReady(ability, gameState)) {
          // Set to idle
          unit.state = {
            type: "idle",
          };

          continue;
        }

        // Turn to face target if necessary
        if (
          !castOrder.target ||
          turnToTarget(body, castOrder.target, gameState)
        ) {
          useAbility(entityId, ability, castOrder, components);

          // Set to idle
          unit.state = {
            type: "idle",
          };
        }
      }
    }
  }
};
