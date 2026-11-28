# HoardersBrain — Product Roadmap

Inventory & encumbrance tracker for tabletop RPGs (D&D 5e, Pathfinder, and friends).

**North star:** sensible defaults out of the box, deep customization underneath. A player creates a character and gets a working 5e-style inventory with no setup. We build and polish the core tabletop loop first (inventory, currency & services, ledger, sorting, templates), then layer deep homebrew customization (custom currencies, rarities, attributes, encumbrance bands, campaigns) underneath once the core experience is rock-solid.

## Current state (Nov 2026)

**Working end-to-end:**
- Character create, switch, remember, rename, and soft-delete; auto-created "On Person" carrying container.
- Containers: create, edit, soft-delete (with type-name confirmation), weight, rarity, carrying & fixed-weight flags, inline collapsible cards, and `ContainerMenuSheet`.
- Items: create (with Looted / Found / Bought acquisition + purse deduction), unified `ItemDetail` inline editing, move/split stacks, transfer between characters, quick use (`-1` on rows, `Use 1` in detail), item value, Sell (50%/100% quick picks + purse credit), Drop, and instant soft-delete.
- Hierarchical tags (global or character-scoped, one-level nesting, `is_usable` flag) managed in Settings → Tags.
- Virtualized inventory list, floating search pill + `Usable` / tag filter chips, display column/row toggles (`InventoryDisplaySheet`), and side-by-side Currency & Encumbrance summary tiles.
- Theme presets + System/Light/Dark mode, sample data fixture, SQLite migrations, `expo-sqlite/kv-store` preferences, and Maestro E2E coverage.

**Next up / missing:**
- Currency Spend/Receive flow for immediately resolved in-game transactions (services, tavern, bribes, rewards) reusing the Buy/Sell purse-preview pattern.
- Ledger tab (second tab) + structured deltas — `ledger` already records Buy, Sell, Drop, Use, and Transfer rows, but has no UI yet and doesn't log currency/container changes.
- Inventory sorting (name, weight, value, rarity).
- Deep homebrew customization (data-driven currencies, rarities, custom attributes, configurable encumbrance, campaigns, creation presets) — intentionally sequenced later.

---

## Phase 0 — Foundations *(S)* — Done

- [x] Fix column naming: `items.container_id` → `items.storage_location_id` (done in the squashed baseline migration)
- [x] Include `ledger` in the exported schema object so migrations can manage it
- [x] Rewrite README: what the app is, how to run, how migrations work

## Phase 0.5 — Design foundation & theming *(L)* — Done

Pulled forward so every screen builds on real tokens instead of the Expo starter palette. Themes are data, with curated presets plus a persisted System/Light/Dark override.

- [x] Semantic token layer (background, surface, text, accent, feedback, border) + ThemeProvider honoring `userInterfaceStyle: "automatic"`, with a persisted System/Light/Dark override
- [x] Presets as data: mind-flayer-purple default plus well-known palettes (Tokyo Night, Catppuccin Mocha/Latte, Nord, Gruvbox), light and dark variants
- [ ] Custom palettes: deferred (Nov 2026) — data layer and ThemeContext API stay in as the baseline; editor UI dropped until presets and dark mode mature
- [x] Theme settings screen: mode switch, preset picker
- [x] Visual pass over all existing screens (type scale, cards, buttons + press states, inputs, badges, Dynamic Type, WCAG AA contrast)
- [x] Migrate every screen and component off raw `Colours` literals; rarity colors split out of the theme
- [x] Brand concept woven through the visual identity: "a brain in a treasure chest" — mind-flayer hoarding loot; purple-forward accent mood
- [x] `TOKENS.md` theming guide

## Phase 1 — CRUD completeness *(M)* — Done

- [x] Edit + soft-delete items
- [x] Edit + soft-delete containers
- [x] Rename character; soft-delete character
- [x] Item detail screen: full description, stats, edit/delete entry points
- [x] Expandable container item lists (no hard 5-item cap)
- [x] Move items between containers; split stacks
- [x] Transfer items between characters (both sides get ledger entries)
- [x] Auto-create an "On Person" container with each character (`carrying = true`, weight 0)
- [x] Editable `max_encumbrance` in character settings
- [x] Weight tracking toggle per character (`weight_tracking` boolean column, default on)

## Phase 1.5 — Core UX, Tags, Pricing & Buy/Sell *(L)* — Done

Core tabletop inventory ergonomics, hierarchical tags replacing `item_type`, item pricing with Buy/Sell flows, and search/display options.

- [x] Inline collapsible container cards with `ContainerMenuSheet` (`...`) for Edit and Delete (with type-name confirmation)
- [x] Unified `ItemDetail` with inline editing, move/split stack, quick use (`Use 1`), and collapsible Remove section (Sell / Drop / Transfer / instant Delete)
- [x] Redesigned item and storage creation forms with disclosure sections and sensible defaults
- [x] Hierarchical tags (`tags` + `item_tags`: character or global scope, one-level nesting, `is_usable` flag), seeded with 5e-flavored defaults (`Consumable → Potion/Scroll/Ammunition/Food & Drink`, `Weapon`, `Armor`, `Magic`, `Tool`, `Treasure`, `Misc`) and managed in Settings → Tags
- [x] Quick use (`-1` button on inventory rows + `Use 1` in `ItemDetail`) decrementing quantity and writing ledger entries
- [x] Item `value` + `value_currency`, Buy flow in `CreateItemForm` (with purse deduction & change preview), Sell flow in `ItemDetail` (50%/100% quick picks + purse credit), plus Looted / Found / Drop notes
- [x] Virtualized inventory list, floating search pill (searches name, description, rarity, and parent/child tags), `Usable` & tag filter chips, display column/row toggles (`InventoryDisplaySheet`), and side-by-side Currency & Encumbrance summary tiles
- [x] Drop legacy `item_type` column from `items` (YAGNI — tags replace item types)
- [x] Require typing the character name to delete a character in `ManageCharacters` (matching container delete friction)

---

## Phase 2 — Currency Transactions & Services *(M)*

Make spending and receiving coins at the table fast, especially for things that resolve immediately in play without creating an inventory item (inn rooms, tavern rounds, bribes, spellcasting services, quest rewards, looted coin piles).

- [ ] Re-use the Buy/Sell purse-preview pattern inside the currency flow for **Spend** (services/expenses) and **Receive** (loot/rewards) with optional reason/source notes
- [ ] Keep direct exact-balance editing available alongside quick Spend / Receive
- [ ] Write ledger entries for all currency transactions and balance edits

## Phase 3 — Ledger *(M)*

Surface the character's activity history — Buy, Sell, Drop, Use, and Transfer are already writing rows to `ledger`.

- [ ] Finalize ledger schema: message, character, timestamp + structured deltas (kind, item id, quantity change, coin delta)
- [ ] Ensure all key mutations write entries: item bought/looted/found/used/sold/dropped/transferred, services & currency changes, container created/deleted
- [ ] Ledger screen (second tab): reverse-chronological, grouped by day, human-readable messages
- [ ] Filter by kind (items / currency / containers)
- [ ] Per-item history view: view everything that happened to an item from `ItemDetail`
- [ ] Soft-delete restore / undo flow (recover deleted items or containers)
- [ ] Group-by-session as a follow-up (day grouping first)

## Phase 4 — Sorting & Inventory Polish *(S–M)*

- [ ] Sorting on the inventory list: name, weight, value, rarity (accessible via display options or search dock)
- [ ] Optional filter refinements (e.g., rarity filter, multi-tag filtering, or flat all-items view if needed during play)
- [ ] Total inventory value sum (sum of item values — pick the right placement once Currency/Ledger settles)
- [ ] Empty states and first-run polish

## Phase 5 — Item Library *(M)*

Items a user creates can become reusable templates; adding a second Health Potion is one tap.

- [ ] Schema: `item_templates` app-global (name, description, weight, rarity, value, default tags)
- [ ] "Add from library" in `CreateItemForm`: search and pick a template to prefill the form
- [ ] "Save to library" from item form/detail — decide explicit save vs auto-save with dedupe by name
- [ ] Template management: edit, delete

---

## Later — Deep Customization & Homebrew Layer

Intentionally sequenced after the core tabletop loop is proven and polished. Customizable definitions follow the character/global scoping pattern until Campaigns arrive.

### Phase 6 — Data-driven currencies *(L)*

Currencies become data instead of hardcoded columns (`pp/gp/sp/cp`).

- [ ] Schema: currency **definitions** (name, abbreviation, value-in-gold as real, sort order) and **balances**
- [ ] Migration: seed each existing character with the 5e set (pp/gp/sp/cp, base-10 chain), carry over balances from the old columns, drop the old columns
- [ ] New characters get the default set seeded
- [ ] Currency management UI: add custom (e.g. electrum at 0.5 gp), rename, remove defaults, reorder
- [ ] Wire Currency tile, Spend/Receive/Edit sheet, item values, and Buy/Sell flows to N currency definitions

### Phase 7 — Data-driven rarities *(M)*

- [ ] Schema: rarity definitions (name, color, sort order) seeded with 5e defaults (Common, Uncommon, Rare, Very Rare, Legendary)
- [ ] Drop `items_rarity_valid` / `storage_rarity_valid` CHECK constraints once rarities live in a table
- [ ] Rarity management UI: add, rename, recolor, remove, reorder
- [ ] Badges and rarity pickers read from data instead of the hardcoded `Rarity` union + `src/constants/rarity.ts`

### Phase 8 — Custom attributes *(M)*

User-defined attributes on items. Attunement is the canonical case — a 5e-flavored boolean attribute, not a hardcoded feature.

- [ ] Schema: attribute definitions (name, value type: text / number / boolean) + values on items (`properties` JSON or join table)
- [ ] Assign and edit attributes in the item form and `ItemDetail`
- [ ] Filter by attribute ("show everything requiring attunement")
- [ ] Ship an "Attunement" boolean in the default definitions so 5e users get it for free

### Phase 9 — Configurable encumbrance *(M)*

- [ ] Bands as data: N thresholds with labels and colors (current fixed warning ≥ max, error ≥ 1.5× max becomes the default)
- [ ] Optional stat field on character (e.g. Strength) so bands can calculate from it (5e: max = STR × 15)
- [ ] Per-container capacity limits with over-limit warning (e.g. Bag of Holding = 500 lb)
- [ ] Band editor UI; Carrying/Encumbrance tile renders bands from data

### Phase 10 — Campaigns & Creation Presets *(L)*

Characters either own their definitions or inherit a campaign's. Balances and inventory stay per character. No persistent game-system entity — presets only seed editable data.

- [ ] Campaign entity: name, description, owns currency, rarity, tag, attribute, and encumbrance-band definitions
- [ ] Characters can join/leave a campaign; "Create campaign from this character's settings"
- [ ] Character switcher groups characters by campaign
- [ ] Inheritance policy: definitions owned by character XOR campaign (no partial overrides to start)
- [ ] "Start from" picker at character creation: 5e default / blank (PF2e later via pack), seeding editable definitions

---

## Icebox

- **5.1 SRD item catalog** — ship the 5.1 SRD (CC-BY-4.0, needs only attribution) as preloaded templates in the Item Library.
- **Pathfinder 2e pack** — bulk instead of pounds, item levels, PF2e rarity semantics (common/uncommon/rare/unique), same base-10 coin chain; ships as a creation preset.
- **Multiplayer campaign sync + party view** — needs a proper backend (API + auth); party view shows all characters in a campaign with combined carry capacity for dividing loot.
- **Export/import** — JSON backup of a character or campaign; sharing between devices.
- **Magic item charge tracking** (may end up covered by custom attributes), gems/art quick-add with value, dice roller, weight unit preference (lbs/kg).

## Open design questions

1. **Ledger granularity** — should direct quantity edits in `ItemDetail` write ledger rows, or only explicit actions (Buy, Sell, Drop, Use, Transfer, Spend/Receive)?
2. **Inventory value total placement** — where does total item value fit best (inside the currency sheet/screen, as secondary info on the Currency tile, or elsewhere)?
3. **Campaign timing** — before Phase 6 (data-driven currencies) starts, decide whether to keep character/global scoping first (matching tags) or introduce Campaigns earlier so the schema migration happens once.

## Decisions

- **Core tabletop loop before deep customization** (Nov 2026) — ship services/currency transactions, Ledger, sorting, and item library first on the 5e foundation; push data-driven currencies/rarities, custom attributes, configurable encumbrance, and campaigns toward the end so the core app is great before taking on heavy customization complexity.
- **Services & resolved coin transactions** (Nov 2026) — reuse the Buy/Sell purse-preview pattern for immediately resolved non-item transactions (inn, tavern, services, quest rewards) so they deduct/credit the purse and log to the ledger without creating dummy items.
- **Tags replace item types** (Nov 2026) — hierarchical tags (`tags` + `item_tags` with `parent_tag_id` and `is_usable`) replace the legacy `item_type` column (YAGNI). Tag creation and editing stay centralized in Settings → Tags rather than inline in item forms.
- **Equipped state dropped** (Nov 2026) — YAGNI as a first-class item field; players who want it can tag items (or use custom attributes later).
- **No separate Gain +N flow** (Nov 2026) — increasing quantity directly in `ItemDetail` and saving is enough; no extra stack-gain modal/section needed.
- **Tiered deletion friction** (Nov 2026) — items and tags delete quickly without confirmation; containers and characters require typing the name to confirm so users don't accidentally wipe a whole container or character. All deletes remain soft-deletes (`deleted_at`).
- **Character rename stays in Settings** (Nov 2026) — renaming a character is rare (once or twice ever) and belongs in Settings → Manage Characters, not in the character switcher.
- **Inline container cards** (Nov 2026) — containers expand/collapse inline on the Inventory screen with a `ContainerMenuSheet` (`...`) for Edit/Delete; no separate Container Detail screen needed.
- **Game-system handling** (Nov 2026) — creation-time presets only, no persistent system entity. Picking a system seeds definitions; everything stays editable after.
- **Attunement** (Nov 2026) — not a first-class feature; system-specific mechanics belong to custom attributes (Phase 8), with an attunement boolean in the default definitions.
- **Party view** (Nov 2026) — deferred until the networking/auth chapter, together with multiplayer sync (icebox).
- **Container deletion** (Nov 2026, revised) — soft deletion only: rows are flagged with `deleted_at`, never removed; every container is deletable including the carrying one; items stay attached to a soft-deleted container. Item transfer targets the carrying-role container (`carrying = true`), creating one only as a fallback.
- **Checkbox semantics** (Nov 2026) — ROADMAP checkboxes record implementation, not UX quality.
- **Weight tracking** (Nov 2026) — per-character `weight_tracking` boolean column (default on).
- **Design direction** (Nov 2026) — polished native iOS base; themes are data (mind-flayer-purple default + curated palettes). Brand concept (not an asset task): an open fantasy chest holding a brain amid scattered loot.
- **Testing architecture** (Nov 2026, revised) — owner decision: agents do not write tests and the jest unit suite was removed entirely. Verification is `npm run check` plus on-device checks on the owner's Android dev build; Maestro E2E remains a coordinator-run merge gate against a stable Release build.
- **Currency UX priority** (Nov 2026) — currency is a first-class surface: balances readable at a glance, spend/gain flows fast to reach; encumbrance stays optional-tier via the weight-tracking toggle.
- **Custom palettes deferred** (Nov 2026) — editor UI dropped to keep the theme screen simple; presets + mode switching are the focus for now.
- **Agent-written copy banned** (Nov 2026) — agents write functional labels and placeholders only; taglines, flavor, and empty-state prose are owner-written or approved.
- **Encumbrance scope** (Nov 2026) — only containers with `carrying = true` (and items inside them unless `is_fixed_weight = true`) contribute to a character's carried weight.
