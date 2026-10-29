# Three.js local browser runtime

The company-first landing sculpture uses [Three.js](https://threejs.org/) version **0.186.1**, from the official [`three` npm package](https://www.npmjs.com/package/three/v/0.186.1).

- Upstream repository: <https://github.com/mrdoob/three.js>
- Package source revision: `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`
- Source archive: <https://registry.npmjs.org/three/-/three-0.186.1.tgz>
- npm archive SHA-1: `6d50f70c2c437f844179bbb56d6f5b774e1ca38a`
- Retrieved: 28 October 2026
- License: MIT, Copyright 2010–2026 Three.js Authors. Full license in this directory and with the public runtime at `frontend/js/vendor/three/LICENSE.txt`.

## Shipped files

| Public file | Upstream source | Preparation |
| --- | --- | --- |
| `three.core.min.js` | `build/three.core.js` | Minified with pinned esbuild 0.25.12; legal comments retained. |
| `three.module.min.js` | `build/three.module.js` | Minified with esbuild 0.25.12; internal core import points to `./three.core.min.js`. |
| `RoundedBoxGeometry.js` | `examples/jsm/geometries/RoundedBoxGeometry.js` | Only bare `three` import relocated to `./three.module.min.js`. |
| `RoomEnvironment.js` | `examples/jsm/environments/RoomEnvironment.js` | Only bare `three` import relocated to `./three.module.min.js`. |

The minification command is `npx --yes esbuild@0.25.12 <source> --minify --format=esm --legal-comments=inline --outfile=<destination>`. Local import names are then adjusted as described above. Build inputs are the pinned upstream package, not a floating CDN response. `checksums.json` records the final shipped files.

The public runtime makes no CDN, model, texture, or environment-map requests. The sculpture, materials, lighting, and geometry are authored in `frontend/js/company-scene.js`. The studio environment is procedural and generated once on initialization. No Three.js npm dependency or build step is required to serve the static website.

## Primary references reviewed

- [Installation](https://threejs.org/manual/#en/installation)
- [WebGLRenderer](https://threejs.org/docs/#WebGLRenderer)
- [MeshPhysicalMaterial](https://threejs.org/docs/#MeshPhysicalMaterial)
- [RoundedBoxGeometry](https://threejs.org/docs/#RoundedBoxGeometry)

The scene is a decorative company illustration. Its three native button controls and service links work if WebGL is unavailable; the supplied SVG fallback remains visible until a successful render. Motion is bounded and event-driven, with reduced-motion, hidden-tab, offscreen, print, and lifecycle handling.
