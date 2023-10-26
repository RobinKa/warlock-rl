import { AbilityId } from "./abilities";

export type GameEventAbilityUsed = {
  type: "abilityUsed";
  entityId: string;
  abilityId: AbilityId;
};

export type GameEventRoundOver = {
  type: "roundOver";
  winners: number[];
};

export type GameEvent = GameEventAbilityUsed | GameEventRoundOver;

export type GameEventsComponent = {
  events: GameEvent[];
};
