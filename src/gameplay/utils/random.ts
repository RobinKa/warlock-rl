import { GameComponent } from "../components";

export function randomInt({ gameState }: GameComponent) {
  let t = (gameState.randomState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function randomRange(min: number, max: number, components: GameComponent) {
  return min + (randomInt(components) % (max - min));
}

export function randomFloat(components: GameComponent) {
  return randomInt(components) / 4294967296;
}
