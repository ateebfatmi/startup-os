# CrewVilla Design System

## Product direction

CrewVilla is a warm, spatial workspace for startup teams. The interface should feel professional and calm, with the friendliness of a shared studio rather than the chrome of an enterprise admin panel. The office is an original architectural 2D environment inspired by real workplace floor plans and spatial collaboration patterns; it must not copy third-party game art or maps.

## Canonical source

Runtime CSS in `app/globals.css` is canonical. This document records intent and maps the active tokens; when implementation and documentation differ, reconcile this file to the reviewed runtime values.

## Foundations

- Typography: Avenir Next, Avenir, Segoe UI, then system sans-serif. Use compact, confident headings and highly legible interface labels.
- Ink: `#142019`; paper: `#f3f1e9`; panel: `#fffefa`; muted text: `#667169`.
- Primary forest: `#173f2b`; deep forest: `#0f2e20`; action accent: `#397455`; active lime: `#c9f36a`.
- Small shadow: `0 1px 2px rgba(16,31,23,.05), 0 8px 24px rgba(16,31,23,.045)`.
- Large shadow: `0 24px 80px rgba(16,31,23,.14)`.
- Corners range from 12px for controls to 24px for large floating surfaces. Pills are reserved for transient status, location, or compact filters.

## 2D office language

- The office uses a warm ivory tile grid, charcoal architectural walls, walnut furniture, forest upholstery, cool display glass, and lime interaction cues.
- Every room needs a visible label, a distinct boundary, and a believable furniture arrangement that communicates purpose without reading documentation.
- Avatars remain visually dominant over furniture and always include a name or “You” label and availability dot.
- Active interaction zones use a restrained dashed lime perimeter. A click destination uses a pulsing target marker.
- Day, sunset, and night modes adjust the surrounding atmosphere, not room semantics or text contrast.

## Interaction contract

- Move with WASD or arrow keys; click the map or a room destination to walk there.
- Press E near an interactive zone to open its existing product panel.
- Room navigation buttons are semantic HTML buttons and expose current location with `aria-current="location"`.
- The map exposes a keyboard-readable application label; all essential actions remain available outside the SVG.
- Motion follows reduced-motion preferences from the global stylesheet.

## Responsive behavior

- Desktop shows the complete plan, room shortcuts, workspace navigation, and communication controls.
- Narrow screens preserve the full plan at a readable fixed width inside a pan-safe scroll area; room shortcuts collapse to avoid obscuring the map.
- Primary communication controls remain reachable without interacting with the map.

## Consistency rules

- Reuse forest/lime for selection and presence; avoid introducing unrelated primary hues.
- Do not use decorative gradients inside product controls. Atmospheric gradients are allowed only on large environmental backdrops.
- Prefer one strong focal surface per view. Avoid card grids over the map.
- New office furniture should reuse the SVG furniture primitives before adding one-off geometry.
