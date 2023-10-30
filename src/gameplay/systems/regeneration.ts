import { GameComponent } from "../components";

export function regenerationSystem({
  healths,
  units,
  gameState,
}: GameComponent) {
  for (const [entityId, unit] of Object.entries(units)) {
    if (entityId in healths) {
      const health = healths[entityId];
      health.current = Math.min(
        health.maximum,
        health.current + unit.healthRegeneration * gameState.deltaTime
      );
    }
  }
}
