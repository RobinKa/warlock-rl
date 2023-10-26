import { ArenaComponent } from "@/gameplay/components/arena";
import { GameComponent } from "@/gameplay/components";

export function getDefaultArena(components?: GameComponent): ArenaComponent {
  const shrinkInterval = 10;
  let time = 0;
  if (components) {
    time = components.gameState.frameNumber * components.gameState.deltaTime;
  }

  return {
    radius: 32 * 15, //20, (13 + 1 per player)
    lavaDamage: 10,
    nextShrinkTime: time + shrinkInterval,
    shrinkInterval: shrinkInterval,
    shrinkRadius: 32,
  };
}
