import { EntityComponents, SingletonComponent } from "@/common/components";
import * as pga from "@/common/ga_zpp";
import { BodyComponent } from "@/gameplay/components/body";
import { GameStateComponent } from "@/gameplay/components/gamestate";
import { HealthComponent } from "@/gameplay/components/health";
import { ArenaComponent } from "../components/arena";

export type LavaSystemInputs = {
  healths: EntityComponents<HealthComponent>;
  bodies: EntityComponents<BodyComponent>;
  arena: SingletonComponent<ArenaComponent>;
  gameState: SingletonComponent<GameStateComponent>;
};

export const lavaSystem = ({
  healths,
  bodies,
  arena,
  gameState,
}: LavaSystemInputs) => {
  const time = gameState.deltaTime * gameState.frameNumber;
  if (time >= arena.nextShrinkTime) {
    arena.nextShrinkTime += arena.shrinkInterval;
    arena.radius = Math.max(0, arena.radius - arena.shrinkRadius);
  }

  for (const entityId in healths) {
    if (entityId in bodies) {
      const radiusSquared = pga.innerProduct(
        bodies[entityId].location,
        bodies[entityId].location
      ).scalar;

      if (radiusSquared > arena.radius * arena.radius) {
        healths[entityId].current = Math.max(
          0,
          healths[entityId].current - arena.lavaDamage * gameState.deltaTime
        );
      }
    }
  }
};
