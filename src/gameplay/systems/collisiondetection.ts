import * as pga from "@/common/ga_zpp";
import { System } from "@/common/systems";
import { GameComponent } from "@/gameplay/components";
import { BodyComponent } from "@/gameplay/components/body";

function integrateBody(body: BodyComponent, dt: number) {
  body.location = pga.add(body.location, pga.multiply(body.velocity, dt));
}

export const collisionDetectionSystem: System<GameComponent> = (
  components: GameComponent
) => {
  const { bodies, detectedCollisions, gameState } = components;

  detectedCollisions.pairs.length = 0;

  const entityIds = Object.keys(bodies);

  for (let i = 0; i < entityIds.length; i++) {
    for (let j = i + 1; j < entityIds.length; j++) {
      const idA = entityIds[i];
      const idB = entityIds[j];
      const bodyA = bodies[idA];
      const bodyB = bodies[idB];

      const aToB = pga.sub(bodies[idB].location, bodies[idA].location);
      const distSq = pga.innerProduct(aToB, aToB).scalar;

      const combinedRadius = bodyA.radius + bodyB.radius;
      const combinedRadiusSq = Math.pow(combinedRadius, 2);
      if (distSq < combinedRadiusSq) {
        const distance = Math.sqrt(distSq);
        const normal =
          distance > 0 ? pga.div(aToB, distance) : { e1: 1, e2: 0 };

        detectedCollisions.pairs.push({
          idA: parseInt(idA),
          idB: parseInt(idB),
          distance,
          normal,
          aToB,
        });
      }
    }
  }
};
