# Pocket Randomizer browser build

This build runs Universal Pokemon Randomizer ZX in the browser with CheerpJ. Users choose a ROM in the page; the file is processed in the browser sandbox and downloaded from there. It is not posted to a server.

## Static deployment

Upload the contents of `site/` to a static host such as Cloudflare Pages. The first run loads CheerpJ from its official CDN and fetches the randomizer JAR from the site. Java 21 is used in the browser.

## Supported files

- `.gba` and `.nds` output as randomized ROMs.
- `.3ds` output as a LayeredFS ZIP. Use a decrypted ROM.
- Large ROMs may require several gigabytes of available browser memory.

The browser page can randomize starters, evolutions, trainer teams, wild encounters, special encounters, items, abilities, and level-up movesets. The ability and moveset options use the randomizer's unrestricted random modes.

## Full settings form

The browser page renders the randomizer settings from `web/lib/form-schema.ts`, grouped into collapsible sections with recommended defaults. Regenerate the static browser schema after editing the form definition:

```bash
node --experimental-strip-types browser-version/export-settings-schema.mjs
```

The generator updates `settings-schema.json` both here and in `site/`. The browser runner sends the selected values to `server/SettingsWriter.java`, which writes the native UPR-ZX settings file before the ROM is randomized.

The randomizer is Universal Pokemon Randomizer ZX v4.6.1 under GPL-3.0. Its source is available from the upstream Ajarmar repository. CheerpJ is used under its community license; the page includes its required attribution.
