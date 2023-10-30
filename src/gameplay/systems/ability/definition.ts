import * as pga from "@/common/ga_zpp";
import { System } from "@/common/systems";
import { GameComponent } from "@/gameplay/components";
import { AbilityOfTarget } from "@/gameplay/components/abilities";

export type AbilityDefinition = {
  postMovement?: System<GameComponent>;
  preAbility?: System<GameComponent>;
  postCollision?: System<GameComponent>;
} & (
  | {
      id: AbilityOfTarget<"point">["id"];
      onUseTarget: (
        entityId: number,
        target: pga.BladeE1 & pga.BladeE2,
        components: GameComponent
      ) => void;
    }
  | {
      id: AbilityOfTarget<"none">["id"];
      onUse: (entityId: number, components: GameComponent) => void;
    }
);
