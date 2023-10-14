import { EntityComponents, SingletonComponent } from "@/common/components";
import { ActionsComponent } from "./actions";
import { ArenaComponent } from "./arena";
import { BodyComponent } from "./body";
import { GameStateComponent } from "./gamestate";
import { HealthComponent } from "./health";
import { LifetimeComponent } from "./lifetime";
import { OrderComponent } from "./order";
import { PlayerOwnedComponent } from "./playerowned";
import { ProjectileComponent } from "./projectile";

export type GameComponent = {
  actions: EntityComponents<ActionsComponent>;
  bodies: EntityComponents<BodyComponent>;
  gameState: SingletonComponent<GameStateComponent>;
  healths: EntityComponents<HealthComponent>;
  lifetimes: EntityComponents<LifetimeComponent>;
  playerOwneds: EntityComponents<PlayerOwnedComponent>;
  projectiles: EntityComponents<ProjectileComponent>;
  orders: EntityComponents<OrderComponent>;
  arena: SingletonComponent<ArenaComponent>;
};
