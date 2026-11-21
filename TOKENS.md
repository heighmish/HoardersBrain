# TOKENS.md — HoardersBrain theming guide

Every screen draws from one visual source of truth: the theme tokens exposed by
`useTheme()`. Read this before building a new screen. The brand is "a brain in a
treasure chest" — a mind flayer hoarding loot, purple-forward.

## The one hook

```tsx
import { useTheme } from "@/stores/ThemeContext";

const theme = useTheme();

theme.colors       // semantic colors (below)
theme.type         // type scale (TextStyle objects, colors baked in)
theme.spacing      // { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
theme.radius       // { sm: 8, md: 12, lg: 16, full: 9999 }
theme.shadows      // { card: "0 1px 2px rgba(0,0,0,0.05)", raised: "0 4px 12px rgba(0,0,0,0.10)" }
theme.mode         // "system" | "light" | "dark"  — the user's preference
theme.resolvedMode // "light" | "dark" — what is actually rendered
theme.presetId     // "mind-flayer" | "dracula" | "tokyo-night" | "catppuccin" | "nord" | "gruvbox" | "custom:<id>"
theme.presetName   // display name of the active preset
theme.customPalettes
theme.selectPreset(presetId)
theme.setMode(mode)
theme.upsertCustomPalette(palette)
```

`ThemeProvider` lives at the root (`app/_layout.tsx`); every screen can call
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

Never write a raw `fontSize`. Use `theme.type.*` (Apple-style ramp):

| Token        | Size | Weight | Color     |
| ------------ | ---- | ------ | --------- |
| `largeTitle` | 34   | 700    | text      |
| `title`      | 22   | 600    | text      |
| `headline`   | 17   | 600    | text      |
| `body`       | 17   | 400    | text      |
| `subhead`    | 15   | 400    | textMuted |
| `caption`    | 12   | 400    | textMuted  |

```tsx
<Text style={theme.type.title}>Bag of Holding</Text>
<Text style={[theme.type.body, { color: theme.colors.accentSecondary }]}>
  Every great hoard begins with a mind.
</Text>
<Text style={[theme.type.body, { fontVariant: ["tabular-nums"] }]}>1.5</Text>
```

Counters and weights use `fontVariant: ["tabular-nums"]`.

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
Sizes: `md` (50) / `sm` (36). Press and disabled states are built in, and
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
3. **Every `Pressable` needs a pressed state** (`opacity: pressed ? 0.7 : 1`)
   or use `Button`.
4. **Readability on fills is computed, not hand-picked** — use
   `theme.colors.accentText` on accent fills; `readableTextColor(hex)` for any
   other fill.
5. **Sheets set their own root** to `theme.colors.surface`
   (`ChangeCharacterSheet`, `UpdateCurrencySheet`, `ThemeSettingsSheet`).
6. **Maestro**: visible labels and testIDs are contracts — keep them stable;
   if a change must break one, update the flow in the same commit.
7. **StatusBar** follows the theme automatically from the root layout — do
   not render `<StatusBar>` in screens.

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
