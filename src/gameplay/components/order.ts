import * as pga from "@/common/ga_zpp";

export type OrderMove = {
  type: "move";
  target: pga.BladeE1 & pga.BladeE2;
};

export type OrderShoot = {
  type: "shoot";
  target: pga.BladeE1 & pga.BladeE2;
};

export type Order = OrderMove | OrderShoot;

export type OrderComponent = {
  order?: Order;
};
