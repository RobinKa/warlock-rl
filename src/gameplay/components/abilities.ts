export type AbilityCommon = {
  lastUsedFrame?: number;
  cooldown: number;
  castTime?: number;
};

export type AbilityScourge = {
  id: "scourge";
  target: "none";
};

export type AbilityShoot = {
  id: "shoot";
  target: "point";
};

export type AbilityHoming = {
  id: "homing";
  target: "point";
};

export type AbilityTeleport = {
  id: "teleport";
  target: "point";
};

export type AbilitySwap = {
  id: "swap";
  target: "point";
};

export type AbilityShield = {
  id: "shield";
  target: "none";
};

export type Ability = AbilityCommon &
  (
    | AbilityScourge
    | AbilityShoot
    | AbilityHoming
    | AbilityTeleport
    | AbilitySwap
    | AbilityShield
  );

export type AbilityId = Ability["id"];
export type AbilityTarget = Ability["target"];

type AbilityOfTargetGeneric<Ability, T> = Ability extends {
  target: T;
}
  ? Ability
  : never;

// Doesn't work without using the generic version for some reason
export type AbilityOfTarget<T> = AbilityOfTargetGeneric<Ability, T>;

export type AbilitiesComponent = Partial<Record<AbilityId, Ability>>;
