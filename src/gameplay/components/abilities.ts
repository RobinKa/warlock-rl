export type AbilityCommon = {
  lastUsedFrame?: number;
  cooldown: number;
};

export type AbilityShoot = {
  id: "shoot";
  target: "point";
};

export type AbilityTeleport = {
  id: "teleport";
  target: "point";
};

export type Ability = AbilityCommon & (AbilityShoot | AbilityTeleport);

export type AbilityId = Ability["id"];
export type AbilityTarget = Ability["target"];

export type AbilityOfTarget<T extends Ability["target"]> = Ability extends {
  target: T;
}
  ? Ability
  : never;

export type AbilitiesComponent = Record<AbilityId, Ability>;
