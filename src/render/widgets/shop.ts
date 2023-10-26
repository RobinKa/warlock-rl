import * as PIXI from "pixi.js";

import { GameComponent } from "@/gameplay/components";
import { AbilityId } from "@/gameplay/components/abilities";

export function useShopWidget(
  entityId: number,
  onBuy: (abilityId: AbilityId) => void
) {
  const container = new PIXI.Container();

  const goldText = new PIXI.Text(undefined, { fontSize: 28 });
  container.addChild(goldText);

  const costTexts: Partial<Record<AbilityId, PIXI.Text>> = {};

  function update({ shops }: GameComponent) {
    goldText.text = `Costs - Gold: ${shops[entityId].gold}G`;

    for (const [abilityId, cost] of Object.entries(shops[entityId].costs)) {
      if (!(abilityId in costTexts)) {
        const costText = new PIXI.Text();
        costText.position.set(0, 30 + Object.keys(costTexts).length * 20);
        container.addChild(costText);
        costText.interactive = true;
        costText.onclick = () => onBuy(abilityId as AbilityId);
        costTexts[abilityId as AbilityId] = costText;
      }
    }

    for (const [abilityId, costText] of Object.entries(costTexts)) {
      costText.text = `${abilityId} - ${
        shops[entityId].costs[abilityId as AbilityId]
      }G`;
    }
  }

  return { container, update };
}
