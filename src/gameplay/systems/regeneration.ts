import { GameComponent } from "../components";

export function regenerationSystem({
  healths,
  units,
  bodies,
  gameState,
}: GameComponent) {
  for (const [entityId, unit] of Object.entries(units)) {
    if (entityId in healths) {
      const health = healths[entityId];

      // Move dead players out of the game
      if (health.current <= 0 && entityId in bodies) {
        health.current = 0;
        bodies[entityId].location = { e1: 1_000_000, e2: 1_000_000 };
        continue;
      }

      health.current = Math.min(
        health.maximum,
        health.current + unit.healthRegeneration * gameState.deltaTime
      );
    }
  }
}
