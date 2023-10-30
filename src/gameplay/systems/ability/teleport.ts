import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { AbilityDefinition } from "./definition";

export const teleportDefinition: AbilityDefinition = {
  id: "teleport",
  onUseTarget: (
    entityId: number,
    target: pga.BladeE1 & pga.BladeE2,
    { bodies, units }: GameComponent
  ) => {
    units[entityId].location = target;
    bodies[entityId].location = target;
    bodies[entityId].velocity = pga.multiply(bodies[entityId].velocity, 0.8);
  },
};
