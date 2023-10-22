type ProjectileComponentHomingPart =
  | {
      homing?: false;
    }
  | {
      homing: true;
      homingTarget?: number | string;
    };

export type ProjectileComponent = {
  damage: number;
} & ProjectileComponentHomingPart;
