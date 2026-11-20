# HoardersBrain — Product Roadmap

Inventory & encumbrance tracker for tabletop RPGs (D&D 5e, Pathfinder, and friends).

**North star:** sensible defaults out of the box, deep customization underneath. A player creates a character and gets a working 5e-style inventory with no setup. A table running homebrew can change currencies, rarities, item types, and encumbrance to fit their campaign.

Customizable things (currencies, rarities, item types) become data keyed to the **character** first; Phase 4 adds campaigns that group characters and share definitions.

## Current state (Nov 2026)

**Working end-to-end:** character create/switch/remember, containers (weight, rarity, carrying, fixed-weight flags), items (name, description, weight, quantity, rarity), currency display + edit, encumbrance card (yellow ≥ max, red ≥ 1.5× max), migrations, Maestro E2E coverage of the create-container journey.

**Stubbed or missing:** `ledger` table defined but excluded from the schema export, no UI, no queries. No edit/delete for anything. `item_type` hardcoded to `"consumable"`. Container cards cap at 5 items with no expand. `max_encumbrance` hardcoded at 100, not editable, weight tracking not optional. Currencies are hardcoded columns (`pp/gp/sp/cp`), rarities a hardcoded TS union. No seed/default data beyond column defaults. Migrations were squashed into a single baseline (`0000_unusual_paladin`) with the `container_id` naming mismatch fixed and CHECK constraints added on weight and rarity.

---

## Phase 0 — Foundations *(S)*

- [x] Fix column naming: `items.container_id` → `items.storage_location_id` (done in the squashed baseline migration)
- [ ] Include `ledger` in the exported schema object so migrations can manage it
- [ ] Rewrite README: what the app is, how to run, how migrations work

## Phase 1 — CRUD completeness *(M)*

Edit and delete for all existing entities; no schema changes.

- [ ] Edit + delete items (deleting a stacked item: remove all vs decrement, by choice)
- [ ] Edit + delete containers (policy for non-empty: block / move items to On Person / confirm-cascade)
- [ ] Edit character name; delete character (clean up child rows, then switch away)
- [ ] Item detail screen: full description, stats, edit/delete entry points
- [ ] Remove the 5-item cap on container cards (expandable, or full list on a container detail screen)
- [ ] Auto-create an "On Person" container with each character (`carrying = true`, weight 0, fixed weight)
- [ ] Editable `max_encumbrance` in a character settings area
- [ ] Weight tracking toggle per character: when off, hide the Carrying card and weight steppers

## Phase 2 — Data-driven currencies *(L)*

Currencies become data instead of hardcoded columns. Definitions and balances are keyed to the character; a campaign can own definitions later without moving balances.

- [ ] Schema: currency **definitions** (name, abbreviation, value-in-gold as real, sort order) and **balances**, keyed to the character
- [ ] Migration: seed each existing character with the 5e set (pp/gp/sp/cp, base-10 chain), carry over balances from the old columns, drop the columns
- [ ] New characters get the default set seeded
- [ ] Currency management UI: add custom (e.g. electrum at 0.5 gp), rename, remove defaults, reorder
- [ ] Currency card and total-in-gold math read definitions
- [ ] Rework `UpdateCurrencySheet` to handle N currencies
- [ ] Currency changes write ledger rows (structured deltas land in Phase 6)

## Phase 3 — Data-driven rarities *(M)*

Rarities become data, same pattern as currencies. Additive change, so it can be done before Phase 2.

- [ ] Schema: rarity definitions per character (name, color, sort order)
- [ ] Seed 5e defaults (Common, Uncommon, Rare, Very Rare, Legendary) with the current palette colors
- [ ] Drop the `items_rarity_valid` / `storage_rarity_valid` CHECK constraints once rarities live in a table
- [ ] Rarity management UI: add, rename, recolor, remove, reorder
- [ ] Badge component and rarity pickers read from data instead of the `Rarity` union + hardcoded `Colours` map
- [ ] Items and containers reference rarity definitions by id

## Phase 4 — Campaigns *(L)*

Characters either own their definitions or inherit a campaign's. Balances and inventory stay per character.

- [ ] Campaign entity: name, description, owns currency + rarity (+ item type, once Phase 5 lands) definitions
- [ ] Characters can join/leave a campaign; definitions follow the campaign
- [ ] "Create campaign from this character's settings": copies a character's definitions to a shared campaign ruleset
- [ ] Character switcher groups characters by campaign
- [ ] Inheritance policy: definitions are owned by exactly one scope — character XOR campaign; switching scopes replaces them, no partial overrides to start

## Phase 5 — Item types & quick use *(M)*

- [ ] Data-driven item types with a `usable` flag; propose a 5e-flavored default set (e.g. Weapon, Armor, Potion, Scroll, Wand, Ring, Ammunition, Tool, Food, Treasure, Other — needs a decision, see open questions)
- [ ] Type picker replaces the hardcoded `"consumable"` in the item form; defaults seeded per character/campaign
- [ ] Quick use action: use a usable item → decrement quantity → ledger entry
- [ ] Gain flow: add quantity with an optional source note ("×2, looted from the ogre cave") → ledger entry
- [ ] Usable-items section on the inventory screen aggregating across containers (or a filter — decide on the layout)
- [ ] Item detail screen reflects type (charges for wands, etc. → icebox)

## Phase 6 — Ledger *(M)*

History of item and currency changes per character.

- [ ] Finalize ledger schema: message, character, timestamp + structured deltas (item id, quantity change, currency id, amount)
- [ ] Every mutation writes an entry: item created/gained/used/moved, container added, currency changed
- [ ] Ledger screen (second tab): reverse-chronological, grouped by day, human-readable messages
- [ ] Filter by kind (items / currency / containers)
- [ ] Group-by-session as a follow-up (day grouping first)

## Phase 7 — Polish *(S per pass)*

- [ ] Dark theme — `app.json` declares `userInterfaceStyle: "automatic"` but the palette is light-only
- [ ] Empty states and first-run polish
- [ ] Search across all items

---

## Icebox

- **5.1 SRD item catalog** — searchable templates, add to inventory prefilled (weight, rarity, type). The 5.1 SRD is CC-BY-4.0, so shipping it needs only attribution.
- **Pathfinder 2e pack** — bulk instead of pounds, item levels, PF2e rarity semantics (common/uncommon/rare/unique), same base-10 coin chain.
- **Encumbrance variants** — 5e STR-based thresholds (×15/×10/×5), configurable warning thresholds instead of hardcoded 1.5×/1.0×.
- **Export/import** — JSON backup of a character or campaign; sharing between devices.
- **Multiplayer campaign sync** — needs a backend; favors UUIDs for ids early.
- **Magic item charge tracking**, gems/art quick-add with value, dice roller, weight unit preference (lbs/kg).

## Open design questions

1. **Campaign timing** — this plan ships character-scoped customization first and adds campaigns in Phase 4. Alternative: campaigns first, so the migration happens once. Decide before Phase 2 starts.
2. **Default item types** — which set ships as the default, and which are flagged usable? Needs a proposal before Phase 5.
3. **Ledger granularity** — every quantity edit a ledger row, or only explicit gain/use actions?
4. **Container deletion policy** (Phase 1) — block until empty, auto-move items to On Person, or confirm-cascade?
