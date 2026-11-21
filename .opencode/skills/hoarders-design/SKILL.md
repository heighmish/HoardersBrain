---
name: Hoarders Design
description: Use when building or restyling any UI in HoardersBrain — screens, components, theme work, or layout changes. Covers the token API entry points, theming rules for native surfaces, the copy rule, layout regression checks, and how to verify design work without a device.
---

# HoardersBrain design rules

`TOKENS.md` documents the full `useTheme` API; this skill is the rulebook that keeps UI work from regressing.

## Copy

You do not write product voice. Functional labels ("Create", "Add Container", "No items") are fine; taglines, flavor, and empty-state prose are not — the owner writes or approves every user-visible sentence. If a screen needs words you are unsure about, put neutral placeholder text and flag it in your report. Never invent subtitles or "on-brand" quips.

## Theme coverage — every surface, both modes

- Tab-navigator headers and root Stack headers are different navigators. Both need explicit themed options (`headerStyle`, `headerTintColor`, `headerTitleStyle`); a header you did not theme renders with white platform defaults in dark mode.
- `Appearance.setColorScheme` in `src/stores/ThemeContext.tsx` is what makes an in-app Light/Dark override reach native chrome (headers, formSheets, tab bar, status-bar area). Do not remove it; "system" mode passes `null`.
- Every screen and presentational component ships render tests asserting it renders in BOTH resolved modes without token crashes, and where practical that a color actually follows the mode (see `__tests__/themeScreens.test.tsx` for the pattern).
- FormSheet content containers get an explicit themed background; the native sheet chrome itself follows `Appearance`.
- Rarity colors live in `src/constants/rarity.ts`, deliberately outside the theme — Phase 3 will data-drive them. `Badge` takes feedback `tone` or an explicit rarity `color`.

## Token discipline

- Hex colors and raw font sizes never appear in `src/app/` or `src/components/` — `npm run lint:design` fails the build on both. Colors come from `useTheme()`, typography from `theme.type.*`.
- Hand-rolled `TextInput` styling and `Pressable` buttons are drift: use the `Input` and `Button` primitives. Promote a new shared primitive only when it appears in two or more screens, has a nameable role, and its API is smaller than its implementation (TOKENS.md "When to extract").
- Text scales with the system text-size setting: size rows with padding or `minHeight` so they can grow, and never disable `allowFontScaling`.

## Layout regression checks on every re-skin

- Tap targets that were full-width stay full-width: use `Button`'s `fullWidth` prop, never per-call-site `alignSelf: "stretch"` patches.
- Cards sharing a row must survive their widest content (badges, tabular numerals, long character names). Wrap, stack, or shrink deliberately — never let content clip.
- Compare the new layout against the previous one for width and height regressions before finishing. The inventory summary cards (Currency / Carrying) are a deliberately temporary stacked arrangement pending an owner design pass — do not restyle them without owner direction.

## Verify

Follow the AGENTS.md verification ladder: `npm run check` (lint + typecheck + the design-token guardrail), then `npm run test` — this is where design work is proven, in both modes. Never validate work-in-progress with device flows; Maestro runs at merge gates only, against a stable Release build. At the gate, a change a person can see gets before/after screenshots from the platforms actually run; if nothing visible changes, report `No UI change.`
