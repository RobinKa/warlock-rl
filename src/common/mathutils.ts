import * as pga from "./ga_zpp";

export function signedAngleDifference(a: number, b: number): number {
  return ((b - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

export function normalized(
  v: pga.BladeE1 & pga.BladeE2
): pga.BladeE1 & pga.BladeE2 {
  const lengthSquared = pga.innerProduct(v, v).scalar;
  if (lengthSquared === 0) {
    return { e1: 1, e2: 0 };
  } else if (lengthSquared === 1) {
    return v;
  }

  return pga.multiply(v, 1 / Math.sqrt(lengthSquared));
}

export function rotate(
  v: pga.BladeE1 & pga.BladeE2,
  angle: number
): pga.BladeE1 & pga.BladeE2 {
  return pga.geometricProduct(
    pga.exponential({
      e12: angle,
    }),
    v
  );
}

export function lerp(alpha: number, from: number, to: number) {
  return (1 - alpha) * from + alpha * to;
}
