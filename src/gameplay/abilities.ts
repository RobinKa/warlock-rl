import { AbilitiesComponent } from "@/gameplay/components/abilities";

export function getAbilityDefaults(): AbilitiesComponent {
  return {
    shoot: {
      id: "shoot",
      target: "point",
      cooldown: 4.8,
      castTime: 0.2,
    },
    teleport: {
      id: "teleport",
      target: "point",
      cooldown: 16,
    },
    swap: {
      id: "swap",
      target: "point",
      cooldown: 15.8,
    },
    homing: {
      id: "homing",
      target: "point",
      cooldown: 15,
      castTime: 0.2,
    },
    scourge: {
      id: "scourge",
      target: "none",
      cooldown: 3,
      castTime: 0.9,
    },
    shield: {
      id: "shield",
      target: "none",
      cooldown: 14,
    },
    cluster: {
      id: "cluster",
      target: "point",
      cooldown: 15.5,
      castTime: 0.2,
    },
    gravity: {
      id: "gravity",
      target: "point",
      cooldown: 21,
      castTime: 0.2,
    },
  };
}
