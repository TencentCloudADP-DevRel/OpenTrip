# UI system (cossUI)

Reference: [../reference/frontend-sources.md](../reference/frontend-sources.md)
and [../reference/handoff.md](../reference/handoff.md).

## Tokens

The cossUI token CSS is ported from the handoff into
`apps/web/src/app/styles/tokens`:

- `colors.css` — `--ink-*` (cool blue-grey) and `--corn-*` (cornflower) ramps
  plus semantic aliases (`--background`, `--foreground`, `--card`, `--primary`,
  `--brand`, `--muted`, `--border`, status colors) and a `.dark` scope.
- `spacing.css` — radius scale (base 10px, card `2xl`), spacing steps,
  elevation shadows, top-highlight, shadow-as-border, focus-ring, and motion
  tokens (`--press-scale: 0.96`, `--ease-out`, `--enter-stagger`).
- `typography.css` — font stacks and type scale.
- `fonts.css` — `@font-face` for Cal Sans, Cal Sans UI, Paper Mono.

Font variable contract: `--font-sans`, `--font-heading`, `--font-mono`. Use
semantic tokens, never raw palette values.

## Primitives

Implemented in `apps/web/src/shared/ui`, matching cossUI APIs:

`button`, `badge`, `input`, `checkbox`, `tabs`, `card` (+ parts), `avatar`,
`spinner`. Each exposes a public `index.ts`. Variants/sizes come from props, not
ad-hoc overrides. Icon-only buttons require `aria-label`; form controls set an
explicit `type`.

## Interaction polish

From make-interfaces-feel-better, applied consistently:

- Root: `-webkit-font-smoothing: antialiased`.
- Headings `text-wrap: balance`; body/caption `text-wrap: pretty`.
- All dynamic numbers (money, time, counts) use `tabular-nums`.
- Transitions specify exact properties — never `transition: all`.
- Pressable controls use `active:scale-[0.96]`.
- Small icon buttons keep a >= 40x40 hit area.
- Concentric radius on nested surfaces; shadows over hard borders for elevated
  surfaces; a 3px cornflower focus ring.

## Accessibility

- Every interactive control is reachable and labeled; icons that are decorative
  use `aria-hidden`.
- Color is never the only signal (status badges pair color with text).
- Respect `prefers-reduced-motion`: staggered enters degrade to the base state.
