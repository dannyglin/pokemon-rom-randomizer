import com.dabomstew.pkrandom.Settings;
import com.dabomstew.pkrandom.pokemon.ExpCurve;
import java.io.FileOutputStream;

/** Creates the randomizer's native .rnqs settings from the website's simple toggles. */
public final class SettingsWriter {
  public static void main(String[] args) throws Exception {
    if (args.length != 7) throw new IllegalArgumentException("Expected output plus six rule flags");
    Settings s = new Settings();
    // A fresh Settings object leaves these serialization fields unset. The
    // desktop GUI normally fills them after a ROM is loaded, but the browser
    // runner writes settings before loading the user's ROM.
    s.setRomName("");
    s.setSelectedEXPCurve(ExpCurve.MEDIUM_FAST);
    boolean starters = Boolean.parseBoolean(args[1]);
    boolean evolutions = Boolean.parseBoolean(args[2]);
    boolean trainers = Boolean.parseBoolean(args[3]);
    boolean wild = Boolean.parseBoolean(args[4]);
    boolean staticPokemon = Boolean.parseBoolean(args[5]);
    boolean items = Boolean.parseBoolean(args[6]);
    if (starters) s.setStartersMod(false, false, true, false);
    if (evolutions) { s.setEvolutionsMod(false, true, false); s.setEvosSimilarStrength(false); }
    if (trainers) {
      s.setTrainersMod(false, true, false, false, false, false);
      s.setTrainersUsePokemonOfSimilarStrength(false);
      s.setTrainersForceFullyEvolved(true);
      s.setTrainersForceFullyEvolvedLevel(30);
    }
    if (wild) {
      s.setWildPokemonMod(false, true, false, false);
      s.setWildPokemonRestrictionMod(true, false, false, false);
      s.setBlockWildLegendaries(false);
    }
    if (staticPokemon) s.setStaticPokemonMod(false, true, false, false);
    if (items) s.setFieldItemsMod(false, false, true, false); 
    try (FileOutputStream out = new FileOutputStream(args[0])) { s.write(out); }
  }
}
