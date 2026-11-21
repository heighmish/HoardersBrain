# TOKENS.md — HoardersBrain design guide

Every screen draws from one visual source of truth: the theme tokens exposed by
`useTheme()`. Read this before building a new screen. The brand is "a brain in a
treasure chest" — a mind flayer hoarding loot, purple-forward. Beyond the
tokens, this guide carries the design rules: copy, footguns, layout regression
checks, and verification.

## North star

Design north star: **Instagram** — interaction and structure follow its
patterns: pushed pages over stacked sheets, icon + label + chevron list rows,
checkmarks for selection, hairline separators, content-forward surfaces with
minimal borders. The palette stays HoardersBrain's own; the north star governs
structure and interaction, not color.

## Copy

You do not write product voice. Functional labels ("Create", "Add Container",
"No items") are fine; taglines, flavor, and empty-state prose are not — the
owner writes or approves every user-visible sentence. If a screen needs words
you are unsure about, put neutral placeholder text and flag it in your report.
Never invent subtitles or "on-brand" quips.

## The one hook

```tsx
import { useTheme } from "@/stores/ThemeContext";

const theme = useTheme();

theme.colors       // semantic colors (below)
theme.type         // type scale (TextStyle objects, colors baked in)
theme.spacing      // { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
theme.radius       // { sm: 8, md: 12, lg: 16, full: 9999 }
theme.shadows      // { card: "0 1px 2px rgba(0,0,0,0.05)", raised: "0 4px 12px rgba(0,0,0,0.10)" }
theme.motion       // { fast: 150, base: 250, slow: 400 } — feedback, elements, surfaces
theme.mode         // "system" | "light" | "dark"  — the user's preference
theme.resolvedMode // "light" | "dark" — what is actually rendered
theme.presetId     // "mind-flayer" | "dracula" | "tokyo-night" | "catppuccin" | "nord" | "gruvbox" | "custom:<id>"
theme.presetName   // display name of the active preset
theme.customPalettes
theme.selectPreset(presetId)
theme.setMode(mode)
theme.upsertCustomPalette(palette)
```

`ThemeProvider` lives at the root (`src/app/_layout.tsx`); every screen can call
`useTheme()`. Settings persist app-level via AsyncStorage.

## Semantic colors

```ts
theme.colors.background       // screen canvas
theme.colors.surface          // cards, sheets, tab bar, inputs fill
theme.colors.text             // primary label
theme.colors.textMuted        // secondary label, placeholders
theme.colors.accent           // buttons, active tab tint, links
theme.colors.accentText       // readable text on an accent fill — computed
theme.colors.accentSecondary  // brand pink/magenta; flavor copy only
theme.colors.border           // hairlines, input outlines
theme.colors.success          // feedback tone (encumbrance ok)
theme.colors.warning          // feedback tone (≥ max encumbrance)
theme.colors.error            // feedback tone (≥ 1.5× max encumbrance)
```

Presets ship as **data** in `src/constants/themePresets.ts` (each defines `light`
and `dark` variants; sources are official palettes: Dracula family, Tokyo
Night, Catppuccin Mocha/Latte, Nord, Gruvbox). Custom palettes are the same
semantic shape and are edited in `ThemeSettingsSheet`.

## Type scale

Never write a raw `fontSize`. Screens consume the ramp through
`ThemedText`; `theme.type.*` directly is for primitives composing their own
labels (Button, NumericInput):

| Token        | Size | Weight | Color     |
| ------------ | ---- | ------ | --------- |
| `largeTitle` | 34   | 700    | text      |
| `title`      | 22   | 600    | text      |
| `headline`   | 17   | 600    | text      |
| `body`       | 17   | 400    | text      |
| `subhead`    | 15   | 400    | textMuted |
| `caption`    | 12   | 400    | textMuted  |

```tsx
import ThemedText from "@/components/Basic/ThemedText";

<ThemedText variant="title">Bag of Holding</ThemedText>
<ThemedText variant="body" style={{ color: theme.colors.accentSecondary }}>
  Every great hoard begins with a mind.
</ThemedText>
<ThemedText variant="body" style={{ fontVariant: ["tabular-nums"] }}>1.5</ThemedText>
```

`variant` defaults to `body`; `style` merges last for color, `fontVariant`, and
other tweaks, and every other `TextProps` (including `testID`) passes through.

Counters and weights use `fontVariant: ["tabular-nums"]`.

## Motion

`theme.motion` holds the three durations the app animates with: `fast` (150)
for state feedback like press and toggle, `base` (250) for element
transitions, `slow` (400) for large surfaces like sheets and screens. Pick by
what is moving, not by feel. Reaching for Reanimated or Animated counts as
animation work — load the `expo-animation` skill first.

## Recipes

Screen root — the Stack already paints `contentStyle` with
`theme.colors.background`; most screens need nothing extra:

```tsx
<View style={{ flex: 1, padding: theme.spacing.md, gap: theme.spacing.md }}>
```

Card:

```tsx
<View
  style={{
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadows.card,
    borderRadius: theme.radius.lg,
    borderCurve: "continuous",
    padding: theme.spacing.md,
  }}
>
```

Input — use the primitive, never hand-roll a TextInput:

```tsx
import Input from "@/components/Basic/Input";

<Input
  value={name}
  onChangeText={setName}
  placeholder="Name"
  testID="thing-name-input"
/>
```

Themed defaults are built in: surface fill, hairline border, `theme.type.body`
typography, muted placeholder color. All other `TextInputProps` pass through,
and `style` merges last for layout tweaks.

Buttons — use the primitive, never hand-roll a Pressable:

```tsx
import Button from "@/components/Basic/Button";

<Button title="Create" onPress={submit} testID="create-thing-button" />
<Button title="Cancel" variant="secondary" size="sm" onPress={cancel} />
```

Variants: `primary` (accent fill) / `secondary` (surface + border).
Sizes: `md` (50) / `sm` (36) — iOS control heights, the sanctioned off-grid
exception (they clear the 44pt minimum touch target); padding and type map to
tokens. Press and disabled states are built in, and
`loading` swaps the title for a spinner while the accessibility label keeps it
(`accessibilityState.busy`).
`style` merges last for layout tweaks (`alignSelf`, `height`).

Badges — two kinds, both from the primitive:

```tsx
import Badge from "@/components/Basic/Badge";
import { rarityColors } from "@/constants/rarity";

<Badge tone="success" text="Encumbrance" />          // feedback: success | warning | error
<Badge text={rarity} color={rarityColors[rarity]} /> // rarity / data-driven fill
<Badge text={rarity} color={rarityColors[rarity]} filled={false} /> // outline chip
```

Rarity colors are **not themed** — `src/constants/rarity.ts` is a separate,
mode-independent palette. Phase 3 will data-drive rarities; keep the split.

Toggles — native `Switch`, themed track, testID on the Switch:

```tsx
<Switch
  value={enabled}
  onValueChange={setEnabled}
  trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
  testID="thing-toggle"
/>
```

Icon in a header/row:

```tsx
<AntDesign name="right" color={theme.colors.textMuted} />
```

## Rules

1. **No color literals in `src/app/` or `src/components/`** — hex values live
   only in `src/constants/theme.ts`, `src/constants/themePresets.ts`, and
   `src/constants/rarity.ts`. New preset values must come from official palette
   sources, verified, not invented. Enforced by `npm run lint:design`.
2. **No raw `fontSize`** — the type ramp owns typography. Enforced by
   `npm run lint:design`.
3. **Spacing steps are tokens** — a padding, margin, or gap that is already a
   step (4, 8, 16, 24, 32, 48) must be `theme.spacing.*`; only genuinely
   off-grid values may stay inline, with a comment. Enforced by
   `npm run lint:design`.
4. **Every `Pressable` needs a pressed state** (`opacity: pressed ? 0.7 : 1`)
   or use `Button`.
5. **Readability on fills is computed, not hand-picked** — use
   `theme.colors.accentText` on accent fills; `readableTextColor(hex)` for any
   other fill.
6. **Sheets set their own root** to `theme.colors.surface`
   (`ChangeCharacterSheet`, `UpdateCurrencySheet`, `ThemeSettingsSheet`).
7. **Maestro**: visible labels and testIDs are contracts — keep them stable;
   if a change must break one, update the flow in the same commit.
8. **System chrome comes from navigator options, never from screens.** The
   root Stack's `screenOptions` sets `statusBarStyle` from `theme.resolvedMode`
   — every native screen view controller answers iOS with that style, so
   pushed forms and sheets never flash the platform default. Do not render
   `<StatusBar>` anywhere, screens or root: an imperative set on the root
   controller is ignored whenever a screen controller is topmost, which is
   exactly the black-icons-in-dark-mode bug. A new top-level navigator must
   repeat the same `statusBarStyle` and header options block (see Footguns).
9. **Every screen and presentational component ships render tests** asserting
   it renders in BOTH resolved modes without token crashes, and where
   practical that a color actually follows the mode (see
   `__tests__/themeScreens.test.tsx` for the pattern).
10. **Sheets are terminal; pages navigate.** A formSheet's rows end in
    actions (switch, save). Menus whose rows lead to pages are themselves
    pages, pushed like any other screen — the Instagram pattern.
11. **Pushed screens render `AppHeader`, never the native header.** The root
    Stack sets `headerShown: false`. react-native-screens styles native header
    items against a navigation bar that is not yet window-attached on iOS 26
    (software-mansion/react-native-screens#4588, open at the time of writing),
    so native back buttons pop and retint during pushes. `AppHeader` is
    React-rendered, token-themed, and cannot bounce. Do not re-enable native
    headers until that fix ships in an Expo-sanctioned release.

## Dynamic Type

Text scales with the user's system text-size setting (`allowFontScaling` is on
by default). Size rows with padding or `minHeight` so they can grow, and let
labels wrap before reaching for `maxFontSizeMultiplier` on constrained chrome.
Never disable scaling app-wide.

## When to extract

Promote a view into `src/components/` only when all three hold: it appears in
two or more screens, it has a nameable role ("Input", "Badge"), and its API is
smaller than its implementation. Until then it stays colocated in the screen.
Never introduce a second theme system beside `useTheme()` — extend the tokens,
presets, and primitives in their own idiom.

## Footguns

- The tab navigator header is the one native-slot header left, and it is
  React-rendered: keep its themed options in `src/app/(tabs)/_layout.tsx`.
  Pushed pages use `AppHeader` (see Rules); the root Stack's native headers
  are disabled.
- `Appearance.setColorScheme` in `src/stores/ThemeContext.tsx` is what makes
  an in-app Light/Dark override reach native chrome (headers, formSheets, tab
  bar, status-bar area). Do not remove it; "system" mode passes `"auto"`,
  the reset value.
- FormSheet content containers get an explicit themed background; the native
  sheet chrome itself follows `Appearance`.

## Layout regression checks on every re-skin

- Tap targets that were full-width stay full-width: use `Button`'s
  `fullWidth` prop, never per-call-site `alignSelf: "stretch"` patches.
- Cards sharing a row must survive their widest content (badges, tabular
  numerals, long character names). Wrap, stack, or shrink deliberately — never
  let content clip.
- Compare the new layout against the previous one for width and height
  regressions before finishing. The inventory summary cards (Currency /
  Carrying) are a deliberately temporary stacked arrangement pending an owner
  design pass — do not restyle them without owner direction.

## Verify

Follow the AGENTS.md verification ladder: `npm run check` (lint + typecheck +
the design-token guardrail), then `npm run test` — this is where design work
is proven, in both modes. Never validate work-in-progress with device flows;
Maestro runs at merge gates only, against a stable Release build. At the gate,
a change a person can see gets before/after screenshots from the platforms
actually run (`.maestro/design-screens.yaml` captures them); if nothing
visible changes, report `No UI change.`
