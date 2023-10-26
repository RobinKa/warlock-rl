import { AbilityId } from "@/gameplay/components/abilities";

export type ShopOrderBuyAbility = {
  type: "buyAbility";
  abilityId: AbilityId;
};

export type ShopOrder = ShopOrderBuyAbility;

export type ShopComponent = {
  gold: number;
  orders: ShopOrder[];
  costs: Partial<Record<AbilityId, number>>;
};
