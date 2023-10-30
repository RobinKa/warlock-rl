import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";
import { addImpulse } from "../physics";

export function bodyCollisionSystem(components: GameComponent) {
  const { detectedCollisions, bodies, units } = components;

  for (const { idA, idB, distance, normal, aToB } of detectedCollisions.pairs) {
    const bodyA = bodies[idA];
    const bodyB = bodies[idB];

    const radius = bodyA.radius + bodyB.radius;
    const r = distance * distance - radius * radius;

    function ellasticResponse() {
      // Ellastic collision
      const momentumTowards =
        (bodyA.mass ?? 0) * pga.innerProduct(bodyA.velocity, normal).scalar -
        (bodyB.mass ?? 0) * pga.innerProduct(bodyB.velocity, normal).scalar;
      if (momentumTowards > 0) {
        const elasticity = 1.5; // TODO: Get from units (1 + avg(e1, e2))
        addImpulse(
          idA,
          components,
          pga.multiply(normal, elasticity * -0.5 * momentumTowards)
        );
        addImpulse(
          idB,
          components,
          pga.multiply(normal, elasticity * 0.5 * momentumTowards)
        );
      }
    }

    if (r < 0) {
      let ellastic = false;

      // Unit-Unit pushback
      if (idA in units && idB in units) {
        // Warlock-Warlock
        let s = Math.sqrt(-r);
        if (s < 30) {
          s = 30;
        }
        const aToB = pga.sub(bodyB.location, bodyA.location);
        const displacement = pga.div(aToB, s);
        bodyA.location = pga.sub(bodyA.location, displacement);
        bodyB.location = pga.add(bodyB.location, displacement);

        ellastic = true;
      } else if (
        (idA in units && bodyB.static) ||
        (idB in units && bodyA.static)
      ) {
        // Warlock-Pillar
        if (idA in units) {
          bodies[idA].location = pga.add(
            bodies[idB].location,
            pga.multiply(normal, -radius)
          );
        } else {
          bodies[idB].location = pga.add(
            bodies[idA].location,
            pga.multiply(normal, radius)
          );
        }

        ellastic = true;
      }

      if (ellastic) {
        ellasticResponse();
      }
    }
  }
}
