import { GameComponent } from "../components";

export const lifetimeSystem = (components: GameComponent) => {
  for (const entityId of Object.keys(components.lifetimes)) {
    const lifetimeComp = components.lifetimes[entityId];
    if (lifetimeComp.remainingFrames !== undefined) {
      if (lifetimeComp.remainingFrames <= 0) {
        for (const component of Object.values(components)) {
          if (entityId in component) {
            // @ts-ignore
            delete component[entityId];
          }
        }
      } else {
        lifetimeComp.remainingFrames -= 1;
      }
    }
  }
};
