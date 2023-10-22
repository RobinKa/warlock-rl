import { AbilityId } from "./abilities";

export type GameEventAbilityUsed = {
  type: "abilityUsed";
  entityId: string;
  abilityId: AbilityId;
};

export type GameEvent = GameEventAbilityUsed;

export type GameEventsComponent = {
  events: GameEvent[];
};
