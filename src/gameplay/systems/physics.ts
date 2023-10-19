import { EntityComponents, SingletonComponent } from "@/common/components";
import * as pga from "@/common/ga_zpp";
import { System } from "@/common/systems";
import { BodyComponent } from "@/gameplay/components/body";
import { GameStateComponent } from "@/gameplay/components/gamestate";

export type PhysicsSystemInputs = {
  gameState: SingletonComponent<GameStateComponent>;
  bodies: EntityComponents<BodyComponent>;
};

export const physicsSystem: System<PhysicsSystemInputs> = ({
  gameState,
  bodies,
}: PhysicsSystemInputs) => {
  for (const body of Object.values(bodies)) {
    body.velocity = pga.add(
      body.velocity,
      pga.multiply(body.force, gameState.deltaTime)
    );
    if (body.dampening !== undefined) {
      body.velocity = pga.multiply(
        body.velocity,
        Math.pow(body.dampening, gameState.deltaTime / (1 / 30))
      );
    }
    body.location = pga.add(
      body.location,
      pga.multiply(body.velocity, gameState.deltaTime)
    );

    body.force = { e1: 0, e2: 0 };
  }
};
