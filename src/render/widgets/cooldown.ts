import * as PIXI from "pixi.js";

import { GameComponent } from "@/gameplay/components";
import { Ability, AbilityId } from "@/gameplay/components/abilities";
import { GameStateComponent } from "@/gameplay/components/gamestate";

export function useCooldownWidget(entityId: number) {
  const container = new PIXI.Container();
  const abilityTexts: Partial<Record<AbilityId, PIXI.Text>> = {};

  function getAbilityCooldown(
    ability: Ability,
    gameState: GameStateComponent
  ): number {
    if (ability.lastUsedFrame === undefined) {
      return 0;
    }

    return Math.max(
      0,
      ability.lastUsedFrame * gameState.deltaTime +
        ability.cooldown -
        gameState.frameNumber * gameState.deltaTime
    );
  }

  function update({ abilities, gameState }: GameComponent) {
    // TODO: Check if abilities got removed
    // (never happens atm so I didn't bother)

    // Check if abilities got added
    for (const abilityId in abilities[entityId]) {
      if (!(abilityId in abilityTexts)) {
        const abilityText = new PIXI.Text();
        abilityText.position.set(0, Object.keys(abilityTexts).length * 20);
        abilityText.anchor.set(0.5, 1.0);
        container.addChild(abilityText);
        abilityTexts[abilityId as AbilityId] = abilityText;
      }
    }

    // Update ability texts
    for (const [abilityId, abilityText] of Object.entries(abilityTexts)) {
      abilityText.text = `${abilityId}: ${getAbilityCooldown(
        abilities[entityId][abilityId as AbilityId]!,
        gameState
      ).toFixed(1)}s`;
    }
  }

  return { container, update };
}
