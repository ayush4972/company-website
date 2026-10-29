# Hyperframes source references

Repository: [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)

Pinned revision: `1bc4bd9ca4d96443113710d0a8f60fc25908ad89`

Retrieved: 27 October 2026

Copyright 2026 HeyGen, Inc. Licensed under the Apache License, Version 2.0. A complete copy is included in [LICENSE](LICENSE).

Hyperframes is an HTML-to-video framework. Its catalog also provides seekable animation primitives. This website uses the catalog's deterministic `render(progress)` approach for interactive scroll-driven presentation rather than installing a video-rendering pipeline.

## Original source copies

The following files are unmodified snapshots at the pinned revision:

| Local copy | Upstream path | SHA-256 |
| --- | --- | --- |
| `three-orbiting-cards.original.html` | `registry/components/three-orbiting-cards/three-orbiting-cards.html` | `0d7c62cb33f8402dec53a54b2c98bd1ae7bd8988d7def24515d558a8455590c1` |
| `parallax-device-dive.original.html` | `registry/components/parallax-device-dive/parallax-device-dive.html` | `45cdb2196398c2b0b76fde7c65a73d1da86075aee2c3399ecf808e78f3216b35` |
| `waapi.original.ts` | `packages/core/src/runtime/adapters/waapi.ts` | `03483f7d32a68c70d8e89e43e72197817fe7c4141ed82ae4258a8fadbbd86943` |
| `LICENSE` | `LICENSE` | `4259155fb06f127687ee7b0a8a3682d45132db0f2da26cbc0b7a2d1e796436b8` |

The HTML source copies are documentation, not public pages. They are not executed by the website. Their optional CDN dependencies and sample assets are not automatically loaded.

## Adaptation boundaries

`three-orbiting-cards` exposes a state object and a `render()` function that maps normalized progress to camera/group transforms. Its orbital placement and camera functions can be adapted to a browser-native 3D scene. `parallax-device-dive` demonstrates a perspective camera, device depth, and an explicit entrance/hold/exit envelope. The WAAPI adapter is retained as a reference for deterministic animation seeking; it is not included wholesale because its global animation hooks are unnecessary for this static website.

Any modified implementation must identify the upstream source and describe its modifications. The original HeyGen branding, UI examples, and sample product claims do not become Trasier product claims.

## Shipped source adaptation

`frontend/js/vendor/hyperframes-orbit.js` is a dependency-free adaptation of the ring placement (upstream lines 82–92) and `render(progress)` transforms (lines 99–104) from `three-orbiting-cards.original.html`. It preserves the deterministic progress-driven math while replacing Three.js scene objects with a pure `sampleOrbit(progress, index, count = 3)` function. The website supplies normalized scroll progress and uses the returned values for browser-native CSS 3D transforms.

Changes are stated in the module header. Scene distances are converted to pixels: horizontal radius 210, vertical radius 115, depth radius 68, and camera distance scaled by 100. Angular values are converted from radians to degrees. Progress is clamped to 0–1, card indices wrap around the requested count, and invalid inputs use stable defaults. Returned fields are `x`, `y`, `z`, `rotationX`, `rotationY`, `rotationZ`, and `cameraZ`. There are no DOM mutations, animation clocks, third-party scripts, or network requests inside this math module.

The complete Apache license also ships with the public module at `frontend/js/vendor/hyperframes-LICENSE.txt`.
