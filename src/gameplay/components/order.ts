import * as pga from "@/common/ga_zpp";
import { AbilityOfTarget } from "./abilities";

export type OrderMove = {
  type: "move";
  target: pga.BladeE1 & pga.BladeE2;
};

export type OrderUseAbility = {
  type: "useAbility";
} & {
  abilityId: AbilityOfTarget<"point">["id"];
  target: pga.BladeE1 & pga.BladeE2;
};

export type Order = OrderMove | OrderUseAbility;

export type OrderComponent = {
  order?: Order;
};
