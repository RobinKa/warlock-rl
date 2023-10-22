import * as pga from "@/common/ga_zpp";
import { GameComponent } from "@/gameplay/components";

export type ImpulseOptions = {
  impulse: pga.BladeE1 & pga.BladeE2;
};

export function addImpulse(
  entityId: number | string,
  { bodies }: GameComponent,
  impulse: pga.BladeE1 & pga.BladeE2
) {
  const body = bodies[entityId];
  if (body) {
    body.velocity = pga.add(body.velocity, pga.div(impulse, body.mass ?? 1));
  }
}
