type ProjectileComponentHomingPart =
  | {
      homing?: false;
    }
  | {
      homing: true;
      homingTarget?: number | string;
    };

type ProjectileComponentSwapPart =
  | {
      swap?: false;
    }
  | {
      swap: true;
      swapped?: boolean;
    };

export type ProjectileComponent = {
  damage: number;
  knockbackMultiplier?: number;
} & ProjectileComponentHomingPart &
  ProjectileComponentSwapPart;
