export type GameStateCommon = {
  startFrame: number;
};

export type GameStateShop = {
  type: "shop";
  duration: number;
} & GameStateCommon;

export type GameStateRound = {
  type: "round";
} & GameStateCommon;

export type GameState = GameStateShop | GameStateRound;

export type GameStateComponent = {
  frameNumber: number;
  deltaTime: number;
  nextEntityId: number;
  randomState: number;
  goldPerRound: number;
  shopTime: number;
  state: GameState;
  round: number;
};
