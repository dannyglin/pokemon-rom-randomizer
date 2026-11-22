POCKET RANDOMIZER — LOCAL ENGINE (macOS)

This small local program connects the Pocket Randomizer page to the Universal
Pokemon Randomizer ZX engine. It processes ROM files on your own Mac. It does
not send them to a website.

START
1. Install Java 17 or newer and Node.js 20 or newer if they are not installed.
2. Unzip this folder somewhere convenient.
3. Double-click start.command. If macOS blocks it, right-click the file, choose
   Open, and confirm. Leave the Terminal window open while randomizing.
4. Open the Pocket Randomizer website in Chrome and click Connect engine.
5. Choose a .gba, .nds, or .3ds file, pick rules, then click Randomize game.

The local page also works at http://127.0.0.1:4769 while the engine is running.

FORMATS
GBA and NDS games download as randomized ROM files. 3DS input produces a
LayeredFS ZIP for a compatible 3DS mod setup; it does not rebuild a standalone
.3ds image. Use decrypted game dumps. Keep your original file as a backup.

PRIVACY
The server listens only on this Mac at 127.0.0.1. Your ROM is written to a
temporary folder during processing, then that folder is removed. The page sends
the file to this local server, not to the hosted site.

LICENSES
PokeRandoZX is free software under the GNU General Public License, version 3.
See LICENSE-PokeRandoZX.txt. SettingsWriter.java and this local bridge are
provided under GPL-3.0-or-later. The bundled PokeRandoZX JAR is the project's
official v4.6.1 release.
