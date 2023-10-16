import { System } from "@/common/systems";
import { GameComponent } from "../components";
import { collisionSystem } from "./collision";
import { lavaSystem } from "./lava";
import { lifetimeSystem } from "./lifetime";
import { movementSystem } from "./movement";
import { physicsSystem } from "./physics";
import { abilitySystem } from "./ability";

export const gameSystem: System<GameComponent> = (
  components: GameComponent
) => {
  const systems: System<GameComponent>[] = [
    abilitySystem,
    movementSystem,
    physicsSystem,
    lavaSystem,
    collisionSystem,
    lifetimeSystem,
  ];

  systems.forEach((system) => system(components));

  components.gameState.frameNumber++;
};
