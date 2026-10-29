/**
 * Adapted from Hyperframes' three-orbiting-cards catalog primitive.
 * Copyright 2026 HeyGen, Inc. SPDX-License-Identifier: Apache-2.0
 * Source: heygen-com/hyperframes, revision 1bc4bd9ca4d96443113710d0a8f60fc25908ad89
 * registry/components/three-orbiting-cards/three-orbiting-cards.html
 *
 * Modifications: extract pure scene math, replace Three.js with CSS-ready
 * pixel/degree values, adapt ring dimensions, and validate caller inputs.
 * Original source: docs/third-party/hyperframes/. Distributed license:
 * ./hyperframes-LICENSE.txt (Apache License, Version 2.0).
 */

/** Sample a deterministic orbital scene; angles are degrees, distances pixels. */
export function sampleOrbit(progress, index, count = 3) {
  const rawProgress = Number(progress);
  const t = Number.isNaN(rawProgress) ? 0 : Math.min(1, Math.max(0, rawProgress));
  const total = Number.isFinite(Number(count)) && Number(count) >= 1
    ? Math.floor(Number(count)) : 3;
  const rawIndex = Number.isFinite(Number(index)) ? Math.trunc(Number(index)) : 0;
  const cardIndex = ((rawIndex % total) + total) % total;
  const angle = (cardIndex / total) * Math.PI * 2;
  const phase = t * Math.PI * 2;
  const degrees = 180 / Math.PI;

  return {
    x: Math.cos(angle) * 210,
    y: Math.sin(angle) * 115,
    z: Math.sin(angle) * 68,
    rotationX: Math.sin(phase) * 0.22 * degrees,
    rotationY: phase * degrees,
    rotationZ: angle * degrees,
    cameraZ: (6.4 - Math.sin(t * Math.PI) * 0.55) * 100,
  };
}
