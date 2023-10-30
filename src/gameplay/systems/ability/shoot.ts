import { createProjectile } from "@/gameplay/projectile";
import { AbilityDefinition } from "./definition";

export const shootDefinition: AbilityDefinition = {
  id: "shoot",
  onUseTarget: (entityId, target, components) =>
    createProjectile(entityId, target, components, {
      damage: 7,
      radius: 25,
      speed: 1000,
      lifetime: 3,
    }),
};
