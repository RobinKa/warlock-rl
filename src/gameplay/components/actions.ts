export type PlayerActionMove = {
  type: "move";
  direction: "up" | "down" | "left" | "right";
};

export type PlayerActionShoot = {
  type: "shoot";
  direction: "up" | "down" | "left" | "right";
};

export type PlayerAction = PlayerActionMove | PlayerActionShoot;

export type ActionsComponent = {
  playerActions: { [playerId: number]: PlayerAction };
};
