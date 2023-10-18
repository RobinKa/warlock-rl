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

export type OrderStop = {
  type: "stop";
};

export type Order = OrderMove | OrderUseAbility | OrderStop;

export type OrderComponent = {
  order?: Order;
};
