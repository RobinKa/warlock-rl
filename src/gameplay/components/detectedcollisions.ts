import * as pga from "@/common/ga_zpp";

export type DetectedCollision = {
  idA: number;
  idB: number;
  distance: number;
  normal: pga.BladeE1 & pga.BladeE2;
  aToB: pga.BladeE1 & pga.BladeE2; // Should be same as normal * distance
  handled?: boolean;
};

export type DetectedCollisionsComponent = {
  pairs: DetectedCollision[];
};
