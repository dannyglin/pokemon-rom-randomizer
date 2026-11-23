import com.dabomstew.pkrandom.Settings;
import com.dabomstew.pkrandom.pokemon.ExpCurve;
import com.dabomstew.pkrandom.pokemon.GenRestrictions;
import java.io.FileOutputStream;
import java.lang.reflect.Method;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** Builds the randomizer's native settings file from the browser form values. */
public final class SettingsWriter {
  private static final Map<String, String> SETTER_ALIASES = Map.of(
      "consumableItemsOnlyForTrainerPokemon", "consumableItemsOnlyForTrainers",
      "sensibleItemsOnlyForTrainerPokemon", "sensibleItemsOnlyForTrainers",
      "highestLevelOnlyGetsItemsForTrainerPokemon", "highestLevelGetsItemsForTrainers");

  public static void main(String[] args) throws Exception {
    if (args.length != 2) throw new IllegalArgumentException("Expected output path and encoded settings");
    Settings settings = new Settings();
    // These fields are normally initialized by the desktop UI after ROM load.
    settings.setRomName("");
    settings.setSelectedEXPCurve(ExpCurve.MEDIUM_FAST);

    for (Map.Entry<String, String> setting : decode(args[1]).entrySet()) {
      apply(settings, setting.getKey(), setting.getValue());
    }
    try (FileOutputStream out = new FileOutputStream(args[0])) { settings.write(out); }
  }

  private static Map<String, String> decode(String query) {
    Map<String, String> values = new HashMap<>();
    for (String pair : query.split("&")) {
      if (pair.isEmpty()) continue;
      int separator = pair.indexOf('=');
      String key = separator < 0 ? pair : pair.substring(0, separator);
      String value = separator < 0 ? "" : pair.substring(separator + 1);
      values.put(URLDecoder.decode(key, StandardCharsets.UTF_8), URLDecoder.decode(value, StandardCharsets.UTF_8));
    }
    return values;
  }

  private static void apply(Settings settings, String property, String value) throws Exception {
    if ("updatedFromOldVersion".equals(property)) return;
    if ("currentRestrictions".equals(property)) {
      settings.setCurrentRestrictions(new GenRestrictions(Integer.parseInt(value)));
      return;
    }

    String javaProperty = SETTER_ALIASES.getOrDefault(property, property);
    String suffix = Character.toUpperCase(javaProperty.charAt(0)) + javaProperty.substring(1);
    Method getter = findGetter(settings.getClass(), suffix);
    if (getter == null) throw new IllegalArgumentException("Unsupported randomizer option: " + property);
    Class<?> type = getter.getReturnType();
    String setterName = "set" + suffix;

    if (type == boolean.class || type == Boolean.class) {
      settings.getClass().getMethod(setterName, boolean.class).invoke(settings, Boolean.parseBoolean(value));
    } else if (type == int.class || type == Integer.class) {
      settings.getClass().getMethod(setterName, int.class).invoke(settings, Integer.parseInt(value));
    } else if (type == String.class) {
      settings.getClass().getMethod(setterName, String.class).invoke(settings, value);
    } else if (type == int[].class) {
      String[] pieces = value.isEmpty() ? new String[0] : value.split(",");
      int[] numbers = new int[pieces.length];
      for (int i = 0; i < pieces.length; i++) numbers[i] = Integer.parseInt(pieces[i]);
      settings.getClass().getMethod(setterName, int[].class).invoke(settings, (Object) numbers);
    } else if (type.isEnum()) {
      setEnum(settings, setterName, type, value);
    } else {
      throw new IllegalArgumentException("Unsupported value type for randomizer option: " + property);
    }
  }

  private static Method findGetter(Class<?> type, String suffix) {
    for (String prefix : new String[]{"get", "is", "do"}) {
      try { return type.getMethod(prefix + suffix); }
      catch (NoSuchMethodException ignored) { }
    }
    return null;
  }

  private static void setEnum(Settings settings, String setterName, Class<?> enumType, String value) throws Exception {
    Object[] constants = enumType.getEnumConstants();
    try {
      @SuppressWarnings({"rawtypes", "unchecked"})
      Object selected = Enum.valueOf((Class) enumType, value);
      settings.getClass().getMethod(setterName, enumType).invoke(settings, selected);
      return;
    } catch (NoSuchMethodException ignored) {
      // Most Settings enum setters accept a boolean selection array instead.
    }
    boolean[] selected = new boolean[constants.length];
    boolean found = false;
    for (int i = 0; i < constants.length; i++) {
      if (((Enum<?>) constants[i]).name().equals(value)) {
        selected[i] = true;
        found = true;
        break;
      }
    }
    if (!found) throw new IllegalArgumentException("Unknown choice '" + value + "' for " + setterName);
    settings.getClass().getMethod(setterName, boolean[].class).invoke(settings, (Object) selected);
  }
}
