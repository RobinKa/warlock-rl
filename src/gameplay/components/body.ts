import * as pga from "@/common/ga_zpp";

export type BodyComponent = {
  location: pga.BladeE1 & pga.BladeE2;
  velocity: pga.BladeE1 & pga.BladeE2;
  force: pga.BladeE1 & pga.BladeE2;
  radius: number;
  dampening?: number;
};
