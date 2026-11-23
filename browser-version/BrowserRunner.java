import com.dabomstew.pkrandom.cli.CliRandomizer;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Runs UPR-ZX against CheerpJ's browser virtual filesystem. */
public final class BrowserRunner {
  public static void main(String[] a) throws Exception {
    if (a.length != 12) throw new IllegalArgumentException("Expected input, extension, eight rules, output and working path");
    String input = a[0];
    String extension = a[1];
    String output = a[10];
    String working = a[11];
    Path statusPath = Path.of(output + ".status");
    String settings = "/files/pocket-rules.rnqs";
    try {
      SettingsWriter.main(new String[]{settings, a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]});
      boolean is3ds = ".3ds".equalsIgnoreCase(extension);
      String romOutput = is3ds ? working : output;
      String[] cli = is3ds
          ? new String[]{"-s", settings, "-i", input, "-o", romOutput, "-d"}
          : new String[]{"-s", settings, "-i", input, "-o", romOutput};
      int result = CliRandomizer.invoke(cli);
      if (result != 0) throw new IllegalStateException("Randomizer exited with code " + result);
      if (is3ds) zipDirectory(new File(working), new File(output));

      File generated = new File(output);
      if (!generated.isFile() || generated.length() == 0) {
        throw new IOException("The randomizer completed without writing its output file.");
      }
      Files.writeString(statusPath, "OK\n" + generated.length(), StandardCharsets.UTF_8);
    } catch (Throwable error) {
      error.printStackTrace();
      String message = error.getMessage();
      if (message == null || message.isBlank()) message = error.getClass().getSimpleName();
      try {
        Files.writeString(statusPath, "ERROR: " + message, StandardCharsets.UTF_8);
      } catch (IOException statusError) {
        statusError.printStackTrace();
      }
    }
  }

  private static void zipDirectory(File source, File zipFile) throws Exception {
    try (ZipOutputStream zip = new ZipOutputStream(new FileOutputStream(zipFile))) {
      addToZip(source, source, zip);
    }
  }

  private static void addToZip(File root, File current, ZipOutputStream zip) throws Exception {
    File[] children = current.listFiles();
    if (children == null) throw new IllegalStateException("Could not read randomized LayeredFS output");
    for (File child : children) {
      String name = root.toURI().relativize(child.toURI()).getPath();
      if (child.isDirectory()) addToZip(root, child, zip);
      else {
        zip.putNextEntry(new ZipEntry(name));
        try (FileInputStream in = new FileInputStream(child)) { in.transferTo(zip); }
        zip.closeEntry();
      }
    }
  }
}
