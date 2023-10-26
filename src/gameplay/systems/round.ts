import { GameComponent } from "@/gameplay/components";
import { randomFloat } from "@/gameplay/random";
import { getDefaultArena } from "../arena";
import { getLivingPlayerIds } from "../player";

function resetGame(components: GameComponent) {
  const {
    players,
    healths,
    bodies,
    abilities,
    units,
    orders,
    projectiles,
    lifetimes,
  } = components;
  // Remove projectiles
  for (const projectileId in projectiles) {
    lifetimes[projectileId].remainingFrames = 0;
  }

  // Reset players
  // TODO: Can this be unified with the initial setup?
  for (const [playerId, player] of Object.entries(players)) {
    // Player
    player.ready = false;

    // Health
    healths[playerId].current = healths[playerId].maximum;

    // Body
    bodies[playerId].location = {
      e1: randomFloat(components) * 500 - 250,
      e2: randomFloat(components) * 500 - 250,
    };
    bodies[playerId].velocity = { e1: 0, e2: 0 };

    // Unit
    units[playerId].knockbackMultiplier = 1;
    units[playerId].walkVelocity = { e1: 0, e2: 0 };
    units[playerId].location = bodies[playerId].location;
    units[playerId].state = { type: "idle" };

    // Order
    orders[playerId].order = undefined;

    // Abilities
    for (const ability of Object.values(abilities[playerId])) {
      ability.lastUsedFrame = undefined;
    }
  }
}

export function roundSystem(components: GameComponent) {
  const { gameState, players } = components;

  switch (gameState.state.type) {
    case "shop":
      // Check if shop time is over or all players are ready
      // and start the round
      if (
        gameState.frameNumber * gameState.deltaTime >
          gameState.state.startFrame * gameState.deltaTime +
            gameState.state.duration ||
        Object.values(players).every((player) => player.ready)
      ) {
        resetGame(components);
        components.arena = getDefaultArena(components);
        components.gameState.round++;
        gameState.state = {
          type: "round",
          startFrame: gameState.frameNumber,
        };
      }
      break;
    case "round":
      // Check if all players are dead and start shop time
      if (getLivingPlayerIds(components).length <= 1) {
        resetGame(components);
        for (const shop of Object.values(components.shops)) {
          shop.gold += components.gameState.goldPerRound;
        }
        components.gameState.state = {
          type: "shop",
          startFrame: gameState.frameNumber,
          duration: gameState.shopTime,
        };
      }
      break;
  }
}
