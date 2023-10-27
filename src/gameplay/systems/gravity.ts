import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";

const MAX_RANGE_SQ_PLAYER = Math.pow(550, 2);
const MAX_RANGE_SQ_PROJECTILE = Math.pow(600, 2);
const STRENGTH_PLAYER = 500;
const STRENGTH_PROJECTILE = 1650;

export function gravitySystem({
  bodies,
  projectiles,
  playerOwneds,
  players,
  gameState,
}: GameComponent) {
  for (const [entityId, projectile] of Object.entries(projectiles)) {
    const body = bodies[entityId];
    if (projectile.gravity && body) {
      const owningPlayerId = playerOwneds[entityId]?.owningPlayerId;
      for (const [otherEntityId, otherBody] of Object.entries(bodies)) {
        const isEnemy =
          owningPlayerId === undefined ||
          playerOwneds[otherEntityId]?.owningPlayerId !== owningPlayerId;

        const isPlayer = otherEntityId in players;
        const isProjectile = otherEntityId in projectiles;

        const offset = pga.sub(body.location, otherBody.location);
        const distSq = pga.innerProduct(offset, offset).scalar;

        if (isPlayer && isEnemy && distSq < MAX_RANGE_SQ_PLAYER) {
          const direction = pga.div(offset, Math.max(1e-5, Math.sqrt(distSq)));
          otherBody.velocity = pga.add(
            otherBody.velocity,
            pga.multiply(
              direction,
              STRENGTH_PLAYER *
                (1 - distSq / MAX_RANGE_SQ_PLAYER) *
                gameState.deltaTime
            )
          );
        } else if (isProjectile && distSq < MAX_RANGE_SQ_PROJECTILE) {
          const direction = pga.div(offset, Math.max(1e-5, Math.sqrt(distSq)));
          otherBody.velocity = pga.add(
            otherBody.velocity,
            pga.multiply(
              direction,
              STRENGTH_PROJECTILE *
                (1.5 - distSq / MAX_RANGE_SQ_PROJECTILE) *
                gameState.deltaTime
            )
          );
        }
      }
    }
  }
}
