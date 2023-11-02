import { GameComponent } from "@/gameplay/components";
import { Ability, AbilityId } from "@/gameplay/components/abilities";
import { GameStateComponent } from "@/gameplay/components/gamestate";
import { OrderUseAbility } from "@/gameplay/components/order";
import { turnToTarget } from "@/gameplay/systems/movement";
import { clusterDefinition } from "./cluster";
import { AbilityDefinition } from "./definition";
import { gravityDefinition } from "./gravity";
import { homingDefinition } from "./homing";
import { linkDefinition } from "./link";
import { scourgeDefinition } from "./scourge";
import { shieldDefinition } from "./shield";
import { shootDefinition } from "./shoot";
import { swapDefinition } from "./swap";
import { teleportDefinition } from "./teleport";

const definitions: AbilityDefinition[] = [
  // Order of these matters as the order is maintained
  // for collision responses.
  shieldDefinition,
  linkDefinition,
  swapDefinition,

  gravityDefinition,
  homingDefinition,
  scourgeDefinition,
  shootDefinition,
  clusterDefinition,
  teleportDefinition,
];

const definitionsById: Record<AbilityId, AbilityDefinition> =
  Object.fromEntries(definitions.map((def) => [def.id, def])) as Record<
    AbilityId,
    AbilityDefinition
  >;

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
  const definition = definitionsById[ability.id];
  if (definition) {
    if ("onUse" in definition) {
      definition.onUse(parseInt(entityId), components);
    }
    if ("onUseTarget" in definition) {
      definition.onUseTarget(parseInt(entityId), castOrder.target, components);
    }
  } else {
    console.warn("Unhandled ability", ability);
  }
}

export const abilitySystem = (components: GameComponent) => {
  const { units, bodies, abilities, gameState } = components;

  definitions.forEach(({ preAbility }) => preAbility?.(components));

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

          components.gameEvents.events.push({
            type: "abilityUsed",
            entityId,
            abilityId: ability.id,
          });
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

export const abilityCollisionSystem = (components: GameComponent) => {
  definitions.forEach(({ postCollision }) => postCollision?.(components));
};

export const abilityMovementSystem = (components: GameComponent) => {
  definitions.forEach(({ postMovement }) => postMovement?.(components));
};
