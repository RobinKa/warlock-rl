import * as pga from "@/common/ga_zpp";
import { signedAngleDifference } from "@/common/mathutils";
import { GameComponent } from "../components";
import { BodyComponent } from "../components/body";
import { GameStateComponent } from "../components/gamestate";

export function turnToTarget(
  body: BodyComponent,
  target: pga.BladeE1 & pga.BladeE2,
  gameState: GameStateComponent
): boolean {
  const direction = pga.sub(target, body.location);
  const targetFacing = Math.atan2(direction.e2, direction.e1);
  const turnRatePerFrame = gameState.deltaTime * body.turnRate;

  const deltaAngle = signedAngleDifference(body.facing, targetFacing);

  if (Math.abs(deltaAngle) > turnRatePerFrame) {
    body.facing += turnRatePerFrame * Math.sign(deltaAngle);
    return false;
  }

  body.facing = targetFacing;
  return true;
}

export const movementSystem = ({ bodies, gameState, units }: GameComponent) => {
  for (const [entityId, unit] of Object.entries(units)) {
    if (unit.state.type === "moving" && entityId in bodies) {
      const body = bodies[entityId];

      if (turnToTarget(body, unit.state.target, gameState)) {
        const bodyToTarget = pga.sub(unit.state.target, body.location);
        const dstSq = pga.innerProduct(bodyToTarget, bodyToTarget).scalar;
        const dstPerFrame = gameState.moveSpeed * gameState.deltaTime;

        if (dstSq <= dstPerFrame * dstPerFrame) {
          body.location = unit.state.target;
          unit.state = { type: "idle" };
        } else {
          const direction = pga.div(bodyToTarget, Math.sqrt(dstSq));
          unit.location = pga.add(
            unit.location,
            pga.multiply(direction, dstPerFrame)
          );
        }
      }
    }
  }
};
