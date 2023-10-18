import { System } from "@/common/systems";
import { GameComponent } from "../components";
import { abilitySystem } from "./ability";
import { collisionSystem } from "./collision";
import { lavaSystem } from "./lava";
import { lifetimeSystem } from "./lifetime";
import { movementSystem } from "./movement";
import { orderSystem } from "./order";
import { physicsSystem } from "./physics";

export const gameSystem: System<GameComponent> = (
  components: GameComponent
) => {
  const systems: System<GameComponent>[] = [
    orderSystem,
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
