import { createProjectile } from "@/gameplay/projectile";
import { AbilityDefinition } from "./definition";

export const clusterDefinition: AbilityDefinition = {
  id: "cluster",
  onUseTarget: (entityId, target, components) =>
    createProjectile(entityId, target, components, {
      damage: 3.3,
      radius: 22,
      speed: 844,
      lifetime: 672 / 844,
      count: 4,
      spread: 0.36,
      knockbackMultiplier: 0.65,
    }),
};
