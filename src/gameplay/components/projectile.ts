import * as pga from "@/common/ga_zpp";

type ProjectileComponentHomingPart =
  | {
      homing?: false;
    }
  | {
      homing: true;
      homingTarget?: number | string;
    };

type ProjectileComponentBoomerangPart =
  | {
      boomerang?: false;
    }
  | {
      boomerang: true;
      acceleration: pga.BladeE1 & pga.BladeE2;
      changedAcceleration: pga.BladeE1 & pga.BladeE2;
      changeAccelerationTime: number;
      stopAccelerationTime: number;
      state: "initial" | "changed" | "stopped";
    };

type ProjectileComponentSwapPart =
  | {
      swap?: false;
    }
  | {
      swap: true;
      swapped?: boolean;
    };

type ProjectileComponentGravityPart = {
  gravity?: boolean;
};

type ProjectileComponentLinkPart = {
  linkId?: number;
};

export type ProjectileComponent = {
  damage: number;
  knockbackMultiplier?: number;
  destroyedOnCollision?: boolean;
} & ProjectileComponentHomingPart &
  ProjectileComponentBoomerangPart &
  ProjectileComponentSwapPart &
  ProjectileComponentGravityPart &
  ProjectileComponentLinkPart;
