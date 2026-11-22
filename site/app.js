let chosenRom = null;
let runtimeReady = false;

const input = document.querySelector('#rom-file');
const drop = document.querySelector('#dropzone');
const button = document.querySelector('#randomize');
const status = document.querySelector('#status-message');

function say(text, isError = false) {
  status.textContent = text;
  status.classList.toggle('error', isError);
}

function syncButton() {
  button.disabled = !chosenRom;
}

function setRom(file) {
  if (!file) return;

  const ext = `.${file.name.toLowerCase().split('.').pop()}`;
  if (!['.gba', '.nds', '.3ds'].includes(ext)) {
    say('Choose a .gba, .nds, or .3ds game file.', true);
    return;
  }

  chosenRom = { file, ext };
  document.querySelector('#drop-title').textContent = file.name;
  document.querySelector('#drop-sub').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · Click to choose another file`;
  document.querySelector('#file-chip').textContent = `${ext.slice(1).toUpperCase()} GAME`;
  document.querySelector('#file-chip').hidden = false;
  say('');
  syncButton();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to begin reading the object URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadJarIntoMemory(url, destination) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Could not load the randomizer engine (${response.status}). Refresh the page and try again.`);
  }
  cheerpOSAddStringFile(destination, new Uint8Array(await response.arrayBuffer()));
}

input.addEventListener('change', event => setRom(event.target.files[0]));

for (const event of ['dragenter', 'dragover']) {
  drop.addEventListener(event, eventObject => {
    eventObject.preventDefault();
    drop.classList.add('drag');
  });
}

for (const event of ['dragleave', 'drop']) {
  drop.addEventListener(event, eventObject => {
    eventObject.preventDefault();
    drop.classList.remove('drag');
  });
}

drop.addEventListener('drop', event => setRom(event.dataTransfer.files[0]));

document.querySelector('#select-all').addEventListener('click', event => {
  const boxes = [...document.querySelectorAll('.rule-card input')];
  const turnOn = boxes.some(box => !box.checked);
  boxes.forEach(box => { box.checked = turnOn; });
  event.currentTarget.textContent = turnOn ? 'Clear all' : 'Select all';
});

button.addEventListener('click', async () => {
  if (!chosenRom) return;

  const label = button.querySelector('span:first-child');
  button.disabled = true;
  label.textContent = 'Starting browser engine…';
  say('Starting Java in this tab. The first start can take a little longer.');

  try {
    if (!runtimeReady) {
      await cheerpjInit({ version: 21 });
      // Cloudflare Pages does not yet return 206 responses for Range requests.
      // CheerpJ can run JARs from /str, so stage the small hosted engine files
      // in memory and avoid its HTTP range loader entirely.
      await loadJarIntoMemory('/browser-tools.jar', '/str/browser-tools.jar');
      await loadJarIntoMemory('/PokeRandoZX.jar', '/str/PokeRandoZX.jar');
      runtimeReady = true;
    }

    label.textContent = 'Preparing game…';
    say('Loading your ROM into the browser sandbox. The game file is not sent to the website.');

    const { file, ext } = chosenRom;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = `/str/pocket-rom${ext}`;
    // Keep the result in CheerpJ's virtual filesystem, then explicitly hand it
    // to the browser download API after the Java process has finished.
    const outputPath = ext === '.3ds'
      ? `/files/${id}-randomized-layeredfs.zip`
      : `/files/${id}-randomized${ext}`;
    const workingPath = `/files/${id}-layeredfs`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    cheerpOSAddStringFile(inputPath, bytes);

    const flags = {};
    document.querySelectorAll('.rule-card input').forEach(box => {
      flags[box.name] = String(box.checked);
    });

    label.textContent = 'Randomizing…';
    say('Randomizing in your browser. Keep this tab open.');

    const code = await cheerpjRunMain(
      'BrowserRunner',
      '/str/browser-tools.jar:/str/PokeRandoZX.jar',
      inputPath,
      ext,
      flags.starters || 'false',
      flags.evolutions || 'false',
      flags.trainers || 'false',
      flags.wild || 'false',
      flags.staticPokemon || 'false',
      flags.items || 'false',
      outputPath,
      workingPath,
    );

    // CheerpJ can resolve cheerpjRunMain with code 0 even when Java main
    // throws. BrowserRunner writes a status file so Java exceptions cannot be
    // mistaken for a successful run.
    let runStatus;
    try {
      runStatus = (await (await cjFileBlob(`${outputPath}.status`)).text()).trim();
    } catch {
      throw new Error(`The engine ended without a result status (exit code ${code}). Please retry; if it repeats, the ROM may not be supported.`);
    }
    if (runStatus.startsWith('ERROR:')) {
      throw new Error(runStatus.slice('ERROR:'.length).trim());
    }
    if (!runStatus.startsWith('OK')) {
      throw new Error(`The engine returned an unexpected result (exit code ${code}). Please try again.`);
    }
    if (code !== 0) {
      throw new Error(`Randomizer stopped with code ${code}. Check that this ROM is supported.`);
    }

    label.textContent = 'Preparing download…';
    say('Randomization finished. Preparing your download…');

    const result = await cjFileBlob(outputPath);
    if (!result || result.size === 0) {
      throw new Error('The randomizer finished but did not create an output file. Check that this ROM is supported and try again.');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const downloadName = ext === '.3ds'
      ? `${baseName}-randomized-layeredfs.zip`
      : `${baseName}-randomized${ext}`;
    downloadBlob(result, downloadName);
    say('Done! Your randomized game has downloaded. Keep the original as a backup.');
  } catch (error) {
    say(error?.message || 'Randomization failed. Check that this ROM is supported.', true);
  } finally {
    label.textContent = 'Randomize game';
    syncButton();
  }
});
