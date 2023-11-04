import * as pga from "@/common/ga_zpp";
import { lerp, rotate } from "@/common/mathutils";
import { GameComponent } from "@/gameplay/components";

export type ProjectileOptions = {
  damage: number;
  radius: number;
  speed: number;
  lifetime?: number;
  count?: number;
  spread?: number;
  knockbackMultiplier?: number;
  destroyedOnCollision?: boolean;
  homing?: boolean;
  swap?: boolean;
  gravity?: boolean;
  linkId?: number;
  boomerang?: boolean;
};

export function createProjectile(
  entityId: number,
  target: pga.BladeE1 & pga.BladeE2,
  { bodies, lifetimes, projectiles, playerOwneds, gameState }: GameComponent,
  {
    damage,
    radius,
    speed,
    lifetime,
    count = 1,
    spread = 0,
    knockbackMultiplier,
    destroyedOnCollision,
    homing,
    swap,
    gravity,
    linkId,
    boomerang,
  }: ProjectileOptions
) {
  // Spawn projectile
  const bodyLocation = bodies[entityId].location;
  const bodyLocationToTarget = pga.sub(target, bodyLocation);
  const distance = Math.sqrt(
    pga.innerProduct(bodyLocationToTarget, bodyLocationToTarget).scalar
  );
  const castDirection = pga.div(bodyLocationToTarget, distance);
  const entityIds = [];
  for (let i = 0; i < count; i++) {
    // 1: 0.5
    // 2: 0, 1
    // 3: 0, 0.5, 1
    // 4: 0, 0.33, 0.66, 1
    const direction = rotate(
      castDirection,
      count === 1 ? 0 : lerp(i / (count - 1), -spread / 2, spread / 2)
    );
    const location = bodyLocation;
    const velocity = pga.multiply(direction, speed);

    const projectileEntityId = gameState.nextEntityId++;
    entityIds.push(projectileEntityId);

    if (lifetime !== undefined) {
      lifetimes[projectileEntityId] = {
        remainingFrames: Math.ceil(lifetime / gameState.deltaTime),
      };
    }

    bodies[projectileEntityId] = {
      location,
      velocity,
      force: { e1: 0, e2: 0 },
      radius: radius,
      facing: 0,
      turnRate: 0,
    };

    projectiles[projectileEntityId] = {
      damage,
      knockbackMultiplier,
      homing,
      swap,
      gravity,
      destroyedOnCollision,
      linkId,
    };

    if (boomerang) {
      const boomerangDistance = Math.min(800, Math.max(300, distance));
      const perpDir = rotate(castDirection, Math.PI / 2);
      const parAcc = -Math.pow(1500, 2) / (2 * boomerangDistance);
      const perpAcc = (2 * parAcc * 300) / 1500;

      bodies[projectileEntityId].velocity = pga.add(
        pga.multiply(castDirection, 1500),
        pga.multiply(perpDir, 300)
      );

      const acceleration = pga.add(
        pga.multiply(castDirection, parAcc),
        pga.multiply(perpDir, perpAcc)
      );
      const changedAcceleration = pga.sub(
        pga.multiply(castDirection, parAcc),
        pga.multiply(perpDir, perpAcc)
      );

      const gameTime = gameState.frameNumber * gameState.deltaTime;
      const changeAccelerationTime = -1500 / parAcc;
      const stopAccelerationTime = changeAccelerationTime - 0.15;

      projectiles[projectileEntityId] = {
        ...projectiles[projectileEntityId],
        boomerang: true,
        state: "initial",
        acceleration,
        changedAcceleration,
        changeAccelerationTime: gameTime + changeAccelerationTime,
        stopAccelerationTime:
          gameTime + changeAccelerationTime + stopAccelerationTime,
      };
    }

    playerOwneds[projectileEntityId] = { ...playerOwneds[entityId] };
  }

  return entityIds;
}
