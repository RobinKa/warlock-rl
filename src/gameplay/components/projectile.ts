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

type ProjectileComponentGravityPart =
  | {
      gravity?: false;
    }
  | {
      gravity: true;
    };

type ProjectileComponentLinkPart = {
  linkId?: number;
};

export type ProjectileComponent = {
  damage: number;
  knockbackMultiplier?: number;
  destroyedOnCollision?: boolean;
} & ProjectileComponentHomingPart &
  ProjectileComponentSwapPart &
  ProjectileComponentGravityPart &
  ProjectileComponentLinkPart;
