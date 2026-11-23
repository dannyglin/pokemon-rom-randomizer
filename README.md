# Pocket Randomizer

Link: https://pocket-randomizer.pages.dev/

A simple browser interface for randomizing owned Pokémon game files. The site is static; randomization happens in a small local engine on each player's computer, so ROM files are not uploaded to GitHub Pages.

## Supported formats

- `.gba`
- `.nds`
- `.3ds` (downloads as a LayeredFS ZIP; it does not rebuild a standalone `.3ds` image)

## Run it on macOS

1. Download `Pocket-Randomizer-Local-Engine.zip` from the website and extract it.
2. Install Java 17+ and Node.js 20+.
3. Open `start.command` in the extracted folder. Keep Terminal open.
4. Open the website, choose a ROM, pick the rules, and select **Randomize game**.

The local page is also available at `http://127.0.0.1:4769` while the engine is running. Use decrypted 3DS dumps. Keep the original ROM as a backup.

## Rules

- **Trainer teams:** Random species without a strength restriction. Trainer Pokémon at level 30+ are forced to fully evolved species where the game supports that change.
- **Wild encounters:** Random eligible Pokémon without a strength restriction; legendary Pokémon may appear.

The engine uses Universal Pokemon Randomizer ZX v4.6.1. Its original project and corresponding source are available at <https://github.com/Ajarmar/universal-pokemon-randomizer-zx>. See `LICENSE-PokeRandoZX.txt` in the local engine bundle for the license.

## Privacy

The local engine listens only on `127.0.0.1`. It processes a selected ROM from a temporary folder and removes that folder after creating the result.
