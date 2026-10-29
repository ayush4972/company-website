# Open Design design resources

This redesign materially uses the editorial design tokens from [nexu-io/open-design](https://github.com/nexu-io/open-design). The official source files were retrieved on October 24, 2026.

## Included source files

- `frontend/css/vendor/open-design-editorial.css` is an unmodified copy of [design-systems/editorial/tokens.css](https://github.com/nexu-io/open-design/blob/main/design-systems/editorial/tokens.css).
- `DESIGN.original.md` is an unmodified copy of the upstream [editorial DESIGN.md](https://github.com/nexu-io/open-design/blob/main/design-systems/editorial/DESIGN.md), retained as reference and provenance.
- `LICENSE` is an unmodified copy of the upstream [repository license](https://github.com/nexu-io/open-design/blob/main/LICENSE): Apache License 2.0, Copyright 2026 Open Design contributors.

## Use and modifications

The original vendor stylesheet is imported by `frontend/css/site.css`. Trasier's own variables and component rules follow that import and override selected semantic values for the white, pale-blue, navy, and cyan palette, typography, and responsive layout. The vendor source itself has not been modified. `DESIGN.md` at the project root documents this custom direction. The website markup, components, interactions, and journal styles are original implementation work.

The design process also consulted the repository's [frontend-design](https://github.com/nexu-io/open-design/blob/main/skills/frontend-design/SKILL.md) and [impeccable-design-polish](https://github.com/nexu-io/open-design/blob/main/skills/impeccable-design-polish/SKILL.md) guidance. Those skill files were not copied into this project. Open Design is used as a source of design resources; its application, daemon, and services are not runtime dependencies of this website.

Keep this provenance and the Apache license with redistributed copies of the vendor material. The download checksums are recorded in `checksums.json`.
