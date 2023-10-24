import * as pga from "@/common/ga_zpp";
import { normalized } from "@/common/mathutils";
import { System } from "@/common/systems";
import { GameComponent } from "@/gameplay/components";

const WALK_SPEED = 1000
const WALK_SPEED_SQ = WALK_SPEED * WALK_SPEED

export const physicsSystem: System<GameComponent> = ({
  gameState,
  bodies,
  units,
}: GameComponent) => {
  for (const [entityId, body] of Object.entries(bodies)) {
    if (body.static) {
      continue
    }
    
    // Remove walk velocity for units
    if (entityId in units) {
      body.velocity = pga.sub(body.velocity, units[entityId].walkVelocity)
    }
    
    // Friction
    if (body.dampening !== undefined) {
      body.velocity = pga.multiply(
        body.velocity,
        Math.pow(body.dampening, gameState.deltaTime / (1 / 30))
      );
    }

    // Add walk velocity for units
    if (entityId in units) {
      // Limit to WALK_SPEED
      units[entityId].walkVelocity = pga.multiply(pga.sub(units[entityId].location, body.location), 1 / gameState.deltaTime)
      if (pga.innerProduct(units[entityId].walkVelocity, units[entityId].walkVelocity).scalar > WALK_SPEED_SQ) {
        units[entityId].walkVelocity = pga.multiply(normalized(units[entityId].walkVelocity), WALK_SPEED)
      }

      body.velocity = pga.add(body.velocity, units[entityId].walkVelocity)
    }

    // Physics integration
    body.velocity = pga.add(
      body.velocity,
      pga.multiply(body.force, gameState.deltaTime)
    );
    body.location = pga.add(
      body.location,
      pga.multiply(body.velocity, gameState.deltaTime)
    );
    body.force = { e1: 0, e2: 0 };

    // Set unit location
    if (entityId in units) {
      units[entityId].location = {...body.location}
    }
  }
};
