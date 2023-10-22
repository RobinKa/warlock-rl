import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { Ability } from "@/gameplay/components/abilities";
import { GameStateComponent } from "@/gameplay/components/gamestate";
import { OrderUseAbility } from "@/gameplay/components/order";
import { dealDamage } from "@/gameplay/damage";
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

type ProjectileOptions = {
  damage: number;
  radius: number;
  speed: number;
  lifetime: number;
  homing?: boolean;
};

function abilityShoot(
  entityId: string,
  target: pga.BladeE1 & pga.BladeE2,
  { bodies, lifetimes, projectiles, playerOwneds, gameState }: GameComponent,
  { homing, damage, radius, speed, lifetime }: ProjectileOptions
) {
  // Spawn projectile
  const bodyLocation = bodies[entityId].location;
  const bodyLocationToTarget = pga.sub(target, bodyLocation);
  const distance = Math.sqrt(
    pga.innerProduct(bodyLocationToTarget, bodyLocationToTarget).scalar
  );
  const direction = pga.div(bodyLocationToTarget, distance);

  const location = bodyLocation;
  const velocity = pga.multiply(direction, speed);

  const projectileEntityId = gameState.nextEntityId++;

  lifetimes[projectileEntityId] = {
    remainingFrames: lifetime / gameState.deltaTime,
  };

  bodies[projectileEntityId] = {
    location,
    velocity,
    force: { e1: 0, e2: 0 },
    radius: radius,
    facing: 0,
    turnRate: 0,
  };

  projectiles[projectileEntityId] = {
    damage,
    homing,
  };

  playerOwneds[projectileEntityId] = { ...playerOwneds[entityId] };
}

function abilityScourge(entityId: string, components: GameComponent) {
  const scourgeDamage = 10;
  const scourgeRadius = 250;
  const scourgeScaleMin = 0.75;
  const scourgeScaleMax = 1;

  const { bodies, healths, units } = components;

  // Damage self
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

  // Damage others
  for (let otherEntityId in units) {
    // Skip self
    if (otherEntityId === entityId) {
      continue;
    }

    if (otherEntityId in bodies) {
      const otherBody = bodies[otherEntityId];

      const offset = pga.sub(otherBody.location, body.location);
      const distanceSq = pga.innerProduct(offset, offset).scalar;
      if (distanceSq <= scourgeRadius * scourgeRadius) {
        const distance = Math.sqrt(distanceSq);
        const knockbackDirection = pga.div(offset, distance);

        const alpha = distance / scourgeRadius;
        const knockbackMultiplier =
          (1 - alpha) * scourgeScaleMax + alpha * scourgeScaleMin;

        dealDamage(otherEntityId, components, {
          amount: scourgeDamage,
          knockbackDirection,
          knockbackMultiplier,
        });
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
      abilityShoot(entityId, castOrder.target, components, {
        damage: 7,
        radius: 25,
        speed: 1000,
        lifetime: 3,
      });
      break;
    case "homing":
      abilityShoot(entityId, castOrder.target, components, {
        damage: 7,
        radius: 30,
        speed: 1000,
        lifetime: 4500 / 1000,
        homing: true,
      });
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
          unit.state.finishedTurning ||
          !("target" in castOrder) ||
          turnToTarget(body, castOrder.target, gameState)
        ) {
          unit.state.finishedTurning = true;

          // Check if cast time is over
          if (ability.castTime) {
            const castTimeEnd =
              unit.state.startFrame * gameState.deltaTime + ability.castTime;
            const gameTime = gameState.frameNumber * gameState.deltaTime;

            if (gameTime < castTimeEnd) {
              continue;
            }
          }

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
