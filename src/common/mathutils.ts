export function signedAngleDifference(a: number, b: number): number {
  return ((b - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}
