import * as pga from "@/common/ga_zpp";
import { OrderUseAbility } from "@/gameplay/components/order";

export type UnitStateIdle = {
  type: "idle";
};

export type UnitStateMoving = {
  type: "moving";
  target: pga.BladeE1 & pga.BladeE2;
};

export type UnitStateCasting = {
  type: "casting";
  castOrder: OrderUseAbility;
};

export type UnitState = UnitStateIdle | UnitStateMoving | UnitStateCasting;

export type UnitComponent = {
  state: UnitState;
};
