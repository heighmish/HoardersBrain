# HoardersBrain — Product Roadmap

Inventory & encumbrance tracker for tabletop RPGs (D&D 5e, Pathfinder, and friends).

**North star:** sensible defaults out of the box, deep customization underneath. A player creates a character and gets a working 5e-style inventory with no setup. A table running homebrew can change currencies, rarities, item types, tags, attributes, and encumbrance to fit their campaign.

Customizable things (currencies, rarities, item types, tags, custom attributes, encumbrance bands) become data keyed to the **character** first; campaigns (Phase 9) group characters and share definitions.

## Current state (Nov 2026)

**Working end-to-end:** character create/switch/remember, containers (weight, rarity, carrying, fixed-weight flags), items (name, description, weight, quantity, rarity), currency display + edit, encumbrance card (yellow ≥ max, red ≥ 1.5× max), migrations, Maestro E2E coverage of the create-container, create-item, and character-switch journeys.

**Stubbed or missing:** `ledger` table defined but excluded from the schema export, no UI, no queries. No edit/delete for anything. `item_type` hardcoded to `"consumable"`. Container cards cap at 5 items with no expand. `max_encumbrance` default 100, not editable in UI, weight tracking not optional. Currencies are hardcoded columns (`pp/gp/sp/cp`), rarities a hardcoded TS union. No seed/default data beyond column defaults. Migrations were squashed into a single baseline (`0000_unusual_paladin`) with the `container_id` naming mismatch fixed and CHECK constraints added on weight and rarity.

---

## Phase 0 — Foundations *(S)*

- [x] Fix column naming: `items.container_id` → `items.storage_location_id` (done in the squashed baseline migration)
- [x] Include `ledger` in the exported schema object so migrations can manage it
- [x] Rewrite README: what the app is, how to run, how migrations work

## Phase 0.5 — Design foundation & theming *(L)*

Pulled forward from Phase 13 so every screen Phase 1+ adds builds on real tokens instead of the Expo starter palette. Themes are data, like every other customizable thing: curated presets plus user-built custom palettes, app-scoped for now; character/campaign scoping follows the Phase 9 pattern later.

- [x] Semantic token layer (background, surface, text, accent, feedback, border) + ThemeProvider honoring `userInterfaceStyle: "automatic"`, with a persisted System/Light/Dark override
- [x] Presets as data: a mind-flayer-purple default plus well-known palettes (Dracula, Tokyo Night, Catppuccin Mocha/Latte, Nord, Gruvbox), light and dark variants where the source palette defines them
- [ ] Custom palettes: deferred (Nov 2026) — data layer and ThemeContext API stay in as the baseline; the editor UI is dropped until presets and dark mode mature
- [x] Theme settings sheet: mode switch, preset picker (custom palette editor removed with the deferral)
- [x] Visual pass over all existing screens (type scale, cards, buttons + press states, inputs, badges) with expo-design-system / expo-native-ui guidance
- [x] Migrate every screen and component off raw `Colours` literals; rarity colors split out of the theme (Phase 3 data-drives them)
- [x] Brand concept woven through the visual identity: "a brain in a treasure chest" — mind-flayer hoarding loot; purple-forward accent mood, flavor naming, empty-state copy. No icon or image asset work in this phase
- [x] TOKENS.md theming guide so Phase 1 screens consume the token API from day one

## Phase 1 — CRUD completeness *(M)*

Edit and delete for all existing entities; no schema changes. All FKs are `ON DELETE no action` with `PRAGMA foreign_keys = ON` enforced, so every delete flow handles child rows explicitly.

- [ ] Edit + delete items (deleting a stacked item: remove all vs decrement, by choice)
- [ ] Edit + delete containers (non-empty policy decided: items move to the auto-created On Person container)
- [x] Edit character name; delete character (clean up child rows, then switch away)
- [ ] Item detail screen: full description, stats, edit/delete entry points
- [ ] Remove the 5-item cap on container cards (expandable, or full list on a container detail screen)
- [ ] Move items between containers; split stacks (3 potions, give 1 away)
- [ ] Transfer items between characters (both sides get ledger entries)
- [x] Auto-create an "On Person" container with each character (`carrying = true`, weight 0, fixed weight)
- [x] Editable `max_encumbrance` in a character settings area
- [x] Weight tracking toggle per character: when off, hide the Carrying card and weight steppers (decided: new `weight_tracking` boolean column, default on)

## Phase 2 — Data-driven currencies *(L)*

Currencies become data instead of hardcoded columns. Definitions and balances are keyed to the character; a campaign can own definitions later without moving balances.

- [ ] Schema: currency **definitions** (name, abbreviation, value-in-gold as real, sort order) and **balances**, keyed to the character
- [ ] Migration: seed each existing character with the 5e set (pp/gp/sp/cp, base-10 chain), carry over balances from the old columns, drop the columns
- [ ] New characters get the default set seeded
- [ ] Currency management UI: add custom (e.g. electrum at 0.5 gp), rename, remove defaults, reorder
- [ ] Adjust-by-delta with a source note (+50 gp, "loot from the ogre cave"), not just absolute-value editing
- [ ] Currency card and total-in-gold math read definitions
- [ ] Rework `UpdateCurrencySheet` to handle N currencies
- [ ] Currency changes write ledger rows (structured deltas land in Phase 12)

## Phase 3 — Data-driven rarities *(M)*

Rarities become data, same pattern as currencies. Additive change, so it can be done before Phase 2.

- [ ] Schema: rarity definitions per character (name, color, sort order)
- [ ] Seed 5e defaults (Common, Uncommon, Rare, Very Rare, Legendary) with the current palette colors
- [ ] Drop the `items_rarity_valid` / `storage_rarity_valid` CHECK constraints once rarities live in a table
- [ ] Rarity management UI: add, rename, recolor, remove, reorder
- [ ] Badge component and rarity pickers read from data instead of the `Rarity` union + hardcoded `Colours` map
- [ ] Items and containers reference rarity definitions by id

## Phase 4 — Data-driven item types & quick use *(M)*

- [ ] Data-driven item types with a `usable` flag; propose a 5e-flavored default set (e.g. Weapon, Armor, Potion, Scroll, Wand, Ring, Ammunition, Tool, Food, Treasure, Other — needs a decision, see open questions)
- [ ] Type picker replaces the hardcoded `"consumable"` in the item form; defaults seeded per character/campaign
- [ ] Equipped state on items (worn/wielded) — system-agnostic, unlike attunement (see decisions); toggle on the item, shown on the row
- [ ] Quick use action: use a usable item → decrement quantity → ledger entry
- [ ] Gain flow: add quantity with an optional source note ("×2, looted from the ogre cave") → ledger entry
- [ ] Item detail screen reflects type (charges for wands, etc. → icebox)

## Phase 5 — Item prices, buy & sell *(M)*

Items get a value; wealth stops being coins-only.

- [ ] Price field on items, denominated in a currency definition (Phase 2)
- [ ] Sell flow: remove item and add currency in one action (ledger entry covers both sides)
- [ ] Buy flow: deduct currency, add item
- [ ] Inventory value total (sum of item prices) alongside the currency card

## Phase 6 — Tags, filters & sorting *(M)*

- [ ] Schema: tags + item-tag join table; tag CRUD; scoped per character like other definitions
- [ ] Tag picker in the item form (multi-select, create tags inline)
- [ ] Flat all-items view alongside the per-container cards (filtering needs a list that spans containers)
- [ ] Filter by type, tag, rarity, and equipped state, combinable ("all consumables", "all scrolls", "potions with the climbing tag")
- [ ] Sorting: name, weight, value, rarity, type
- [ ] Saved filter views, with a default "usable items" view shipping out of the box

## Phase 7 — Custom attributes *(M)*

User-defined attributes on items. Attunement is the canonical case — a 5e-flavored boolean attribute, not a hardcoded feature (see decisions).

- [ ] Schema: attribute definitions per character/campaign (name, value type: text / number / boolean) + values on items (the unused `properties` JSON column or a join table — decide)
- [ ] Assign and edit attributes in the item form and item detail
- [ ] Filter by attribute ("show everything requiring attunement")
- [ ] Ship an "attunement" boolean in the default definitions so 5e users get it for free

## Phase 8 — Item library *(M)*

Items a user creates become reusable templates; adding a second Health Potion is one tap.

- [ ] Schema: `item_templates` app-global (name, description, type, weight, rarity, price, default tags, default attributes)
- [ ] "Add from library" in the item form: search and pick a template to prefill the form
- [ ] "Save to library" from the item form — decide explicit save vs auto-save with dedupe by name
- [ ] Template management: edit, delete

## Phase 9 — Campaigns *(L)*

Characters either own their definitions or inherit a campaign's. Balances and inventory stay per character.

- [ ] Campaign entity: name, description, owns currency, rarity, item type, tag, attribute, and encumbrance-band definitions
- [ ] Characters can join/leave a campaign; definitions follow the campaign
- [ ] "Create campaign from this character's settings": copies a character's definitions to a shared campaign ruleset
- [ ] Character switcher groups characters by campaign
- [ ] Inheritance policy: definitions are owned by exactly one scope — character XOR campaign; switching scopes replaces them, no partial overrides to start

## Phase 10 — Configurable encumbrance *(M)*

Encumbrance bands become data instead of fixed thresholds.

- [ ] Bands as data: N thresholds with labels and colors; the current fixed set (warning ≥ max, error ≥ 1.5× max) becomes the default
- [ ] Optional stat field on the character (e.g. Strength) so bands can calculate from it (5e: max = STR × 15)
- [ ] Per-container capacity limits with over-limit warning (bag of holding = 500 lb) — character-level `max_encumbrance` already exists; this is the container-level limit
- [ ] Band editor UI per character/campaign
- [ ] 5e variant preset (×15/×10/×5) as the shipped default; PF2e bulk preset ships with the PF2e pack
- [ ] Carrying card renders bands from data

## Phase 11 — Creation presets *(S)*

Pick a starting point at character creation. No persistent game-system entity — presets only seed data (see decisions).

- [ ] "Start from" picker at character creation: 5e default / blank (PF2e later via the pack)
- [ ] The 5e preset seeds currencies, rarities, item types, encumbrance bands, and an attunement attribute
- [ ] Everything editable after seeding

## Phase 12 — Ledger *(M)*

History of item and currency changes per character.

- [ ] Finalize ledger schema: message, character, timestamp + structured deltas (item id, quantity change, currency id, amount)
- [ ] Every mutation writes an entry: item created/gained/used/moved/transferred, container added, currency changed, sold/bought
- [ ] Ledger screen (second tab): reverse-chronological, grouped by day, human-readable messages
- [ ] Per-item history view: tap an item for everything that ever happened to it (structured deltas make it a filter)
- [ ] Filter by kind (items / currency / containers)
- [ ] Group-by-session as a follow-up (day grouping first)

## Phase 13 — Polish *(S per pass)*

- [ ] Dark theme — moved to Phase 0.5
- [ ] Empty states and first-run polish
- [ ] Search across all items

---

## Icebox

- **5.1 SRD item catalog** — ship the 5.1 SRD (CC-BY-4.0, needs only attribution) as preloaded templates in the Phase 8 library.
- **Pathfinder 2e pack** — bulk instead of pounds, item levels, PF2e rarity semantics (common/uncommon/rare/unique), same base-10 coin chain; ships as a creation preset.
- **Multiplayer campaign sync + party view** — needs a proper backend (API + auth); party view shows all characters in a campaign with combined carry capacity for dividing loot. Favors UUIDs for ids early.
- **Export/import** — JSON backup of a character or campaign; sharing between devices.
- **Magic item charge tracking** (may end up covered by custom attributes), gems/art quick-add with value, dice roller, weight unit preference (lbs/kg).

## Open design questions

1. **Campaign timing** — this plan ships character-scoped customization first and adds campaigns in Phase 9. Alternative: campaigns first, so the migration happens once. Decide before Phase 2 starts.
2. **Default item types** — which set ships as the default, and which are flagged usable? "Show me all consumables" vs "show me scrolls" suggests either a category level above types (consumable → potion/scroll) or flat types with broad ones included. Needs a proposal before Phase 4.
3. **Ledger granularity** — every quantity edit a ledger row, or only explicit gain/use actions?

## Decisions

- **Game-system handling** (Nov 2026) — creation-time presets only, no persistent system entity. Picking a system seeds definitions; everything stays editable after. See Phase 11.
- **Attunement** (Nov 2026) — not a first-class feature; system-specific mechanics belong to custom attributes (Phase 7), with an attunement boolean in the default definitions. Equipped IS first-class (worn/wielded is system-agnostic) — Phase 4.
- **Party view** (Nov 2026) — deferred until the networking/auth chapter, together with multiplayer sync (icebox).
- **Container deletion** (Nov 2026) — deleting a non-empty container moves its items to the character's On Person container; nothing is destroyed implicitly.
- **Weight tracking** (Nov 2026) — per-character `weight_tracking` boolean column (default on) ships with Phase 1 despite the phase's no-schema note.
- **Design direction** (Nov 2026) — polished native iOS base; themes are data: a mind-flayer-purple default plus curated well-known palettes (Dracula, Tokyo Night, Catppuccin, Nord, Gruvbox) and user-built custom palettes, app-scoped for now. Dark mode pulled forward from Phase 13 into Phase 0.5. Brand concept (not an asset task): an open fantasy chest holding a brain amid scattered loot.
- **Testing architecture** (Nov 2026) — jest-expo + better-sqlite3 in-memory is the fast verification loop for all agents (unit-first ladder in AGENTS.md). Maestro E2E covers golden paths at merge gates against a stable build, never as a work-in-progress tool; a QA release build replaces the dev build as the E2E target. No CI E2E yet.
- **Currency UX priority** (Nov 2026) — currency is a first-class surface: balances readable at a glance, spend/gain flows fast to reach. The inventory summary arrangement stays the owner's original compact side-by-side cards until a proper design pass; encumbrance stays optional-tier (Phase 1's weight-tracking toggle hides the Carrying card).
- **Custom palettes deferred** (Nov 2026) — editor UI dropped to keep the theme sheet simple; presets + mode switching are the focus for now. The palette data layer and ThemeContext API remain, so custom themes can return without schema work.
- **Agent-written copy banned** (Nov 2026) — agents write functional labels and placeholders only; taglines, flavor, and empty-state prose are owner-written or approved. The Phase 0.5 flavor strings were removed.
