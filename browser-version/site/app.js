let chosenRom = null;
let runtimeReady = false;
let settingsSchema = null;
let settingsValues = null;
let settingsReady = false;

const input = document.querySelector('#rom-file');
const drop = document.querySelector('#dropzone');
const button = document.querySelector('#randomize');
const status = document.querySelector('#status-message');
const SETTINGS_STORAGE_KEY = 'pocket-randomizer-settings-v2';

const sectionDescriptions = {
  'pokemon-traits': 'Change how Pokémon grow, what types and abilities they have, and how they evolve.',
  'starters-statics-trades': 'Change starter choices, gifts, fixed encounters, and in-game trades.',
  'moves-movesets': 'Change move properties, level-up learnsets, and move options.',
  trainers: 'Customize trainer teams, levels, held items, and special battles.',
  wild: 'Choose how wild encounters are replaced and whether any restrictions apply.',
  'tms-tutors': 'Change TM, HM, and tutor moves, as well as which Pokémon can learn them.',
  items: 'Randomize items found in the world, in shops, and through Pokémon abilities.',
  misc: 'Set whole-game rules and optional changes to supported games.',
};

const miscTweaks = [
  { bit: 0, label: 'Use the Black and White experience system', help: 'Changes how experience is awarded in supported games.' },
  { bit: 1, label: 'Reduce X Accuracy exploits', help: 'Stops X Accuracy from enabling repeated sleep, trapping, or one-hit KO moves in supported games.' },
  { bit: 2, label: 'Use later-generation critical-hit rules', help: 'Changes critical hits to use the later 1-in-16 base chance where supported.' },
  { bit: 3, label: 'Show text immediately', help: 'Removes most in-game text delay.' },
  { bit: 4, label: 'Allow running shoes indoors', help: 'Lets you run in locations that normally restrict the running shoes.' },
  { bit: 5, label: 'Randomize the first PC item', help: 'Changes the free item in the PC at the start of supported games.' },
  { bit: 6, label: 'Allow Pikachu to evolve', help: 'Allows Pikachu to evolve using a Thunder Stone in supported games.' },
  { bit: 7, label: 'Give the National Pokédex at the start', help: 'Makes the full Pokédex available earlier where supported.' },
  { bit: 8, label: 'Update type effectiveness', help: 'Applies later-generation type matchups without adding the Fairy type.' },
  { bit: 9, label: 'Unlock Challenge Mode', help: 'Enables Challenge Mode in supported games.' },
  { bit: 10, label: 'Use standard capitalization for Pokémon names', help: 'Changes all-capital names to standard title case.' },
  { bit: 11, label: 'Randomize the catching tutorial', help: 'Changes the Pokémon used in the catching tutorial where supported.' },
  { bit: 12, label: 'Exclude Lucky Eggs from randomized items', help: 'Prevents Lucky Eggs from appearing in randomized item pools.' },
  { bit: 13, label: 'Remove the free Lucky Egg', help: 'Removes a free Lucky Egg from supported Black and White games.' },
  { bit: 14, label: 'Exclude very valuable relics from item pools', help: 'Keeps high-value maniac items out of randomized item pools.' },
  { bit: 15, label: 'Enable SOS battles more broadly', help: 'Allows SOS battles outside their normal locations in supported games.' },
  { bit: 16, label: 'Balance fixed encounter levels', help: 'Adjusts certain fixed encounter levels in supported games.' },
  { bit: 17, label: 'Keep alternate forms available', help: 'Preserves alternate forms when supported by the game.' },
  { bit: 18, label: 'Run without the running shoes', help: 'Allows running without needing to obtain the running shoes.' },
  { bit: 19, label: 'Speed up HP and experience bars', help: 'Makes battle HP and experience bars animate faster.' },
  { bit: 20, label: 'Speed up the Distortion World', help: 'Speeds up movement in the Distortion World where supported.' },
  { bit: 21, label: 'Update Rotom form type matchups', help: 'Uses the later type matchups for Rotom forms where supported.' },
  { bit: 22, label: 'Turn off low-HP music', help: 'Disables the low-HP warning music where supported.' },
];

function say(text, isError = false) {
  status.textContent = text;
  status.classList.toggle('error', isError);
}

function syncButton() {
  button.disabled = !chosenRom || !settingsReady;
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

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function helpFor(field) {
  if (field.help && field.help !== 'Turn this on to apply this optional rule during randomization.') return field.help;
  if (field.kind.type === 'checkbox') return `Turn on to apply “${field.label.toLowerCase()}” when the selected game supports it.`;
  return `This setting changes ${field.label.toLowerCase()}. It may only apply to some games.`;
}

function isVisible(field) {
  if (!field.when) return true;
  const key = JSON.stringify(field.when.keys.map(name => settingsValues[name]));
  return field.when.table[key] === true;
}

function settingChanged(name, value) {
  settingsValues[name] = value;
  persistSettings();
  updateConditionalFields();
}

function renderRestrictionControls(field) {
  const wrapper = makeElement('div', 'generation-limits');
  wrapper.dataset.limitSettings = 'true';
  wrapper.hidden = !settingsValues.limitPokemon;
  const hint = makeElement('p', 'setting-help', 'Choose which generations can appear in random Pokémon pools.');
  wrapper.append(hint);
  const choices = makeElement('div', 'generation-checkboxes');
  for (let gen = 1; gen <= 7; gen++) {
    const label = makeElement('label', 'mini-check');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = (settingsValues.generationMask & (1 << (gen - 1))) !== 0;
    checkbox.dataset.generationBit = String(gen - 1);
    checkbox.addEventListener('change', () => {
      let mask = Number(settingsValues.generationMask ?? 127);
      const bit = 1 << Number(checkbox.dataset.generationBit);
      mask = checkbox.checked ? mask | bit : mask & ~bit;
      settingChanged('generationMask', mask);
    });
    label.append(checkbox, document.createTextNode(` Gen ${gen}`));
    choices.append(label);
  }
  const relatives = makeElement('label', 'mini-check');
  const relativesBox = document.createElement('input');
  relativesBox.type = 'checkbox';
  relativesBox.checked = Boolean(settingsValues.allowEvolutionaryRelatives);
  relativesBox.addEventListener('change', () => settingChanged('allowEvolutionaryRelatives', relativesBox.checked));
  relatives.append(relativesBox, document.createTextNode(' Include evolution relatives outside the selected generations'));
  choices.append(relatives);
  wrapper.append(choices);
  return wrapper;
}

function renderCustomStarters(field) {
  const wrapper = makeElement('div', 'custom-starters');
  wrapper.dataset.field = field.name;
  const hint = makeElement('p', 'setting-help', 'Enter the Pokémon index used by this game. Leave a value at 0 to let the game’s own list determine the choice.');
  wrapper.append(hint);
  const values = Array.isArray(settingsValues.customStarters) ? [...settingsValues.customStarters] : [0, 0, 0];
  for (let index = 0; index < 3; index++) {
    const label = makeElement('label', 'setting-label', `Starter ${index + 1} species index`);
    const control = document.createElement('input');
    control.type = 'number';
    control.min = '0';
    control.max = '1000';
    control.value = String(values[index] ?? 0);
    control.addEventListener('input', () => {
      values[index] = Number(control.value) || 0;
      settingChanged('customStarters', values);
    });
    const row = makeElement('div', 'custom-starter-field');
    row.append(label, control);
    wrapper.append(row);
  }
  return wrapper;
}

function renderMiscTweaks() {
  const wrapper = makeElement('div', 'misc-tweaks-list');
  const intro = makeElement('p', 'setting-help', 'These small quality-of-life changes only run in games that support them. Unsupported choices are ignored.');
  wrapper.append(intro);
  const checked = Number(settingsValues.currentMiscTweaks ?? 0);
  for (const tweak of miscTweaks) {
    const row = makeElement('label', 'setting-checkbox');
    const control = document.createElement('input');
    control.type = 'checkbox';
    control.checked = (checked & (1 << tweak.bit)) !== 0;
    control.dataset.tweakBit = String(tweak.bit);
    const text = makeElement('span', 'setting-copy');
    text.append(makeElement('strong', '', tweak.label), makeElement('small', '', tweak.help));
    control.addEventListener('change', () => {
      let mask = Number(settingsValues.currentMiscTweaks ?? 0);
      const bit = 1 << tweak.bit;
      mask = control.checked ? mask | bit : mask & ~bit;
      settingChanged('currentMiscTweaks', mask);
    });
    row.append(control, text);
    wrapper.append(row);
  }
  return wrapper;
}

function renderControl(field) {
  const wrapper = makeElement('div', 'setting-field');
  wrapper.dataset.field = field.name;
  const label = makeElement('label', 'setting-label', field.label);
  const help = makeElement('small', 'setting-help', helpFor(field));
  let control;

  if (field.kind.type === 'checkbox') {
    const row = makeElement('label', 'setting-checkbox');
    control = document.createElement('input');
    control.type = 'checkbox';
    control.checked = Boolean(settingsValues[field.name]);
    control.addEventListener('change', () => settingChanged(field.name, control.checked));
    const copy = makeElement('span', 'setting-copy');
    copy.append(makeElement('strong', '', field.label), makeElement('small', '', helpFor(field)));
    row.append(control, copy);
    wrapper.append(row);
    if (field.name === 'limitPokemon') wrapper.append(renderRestrictionControls(field));
    return wrapper;
  }

  if (field.kind.type === 'radio' || field.kind.type === 'select') {
    control = document.createElement('select');
    for (const option of field.kind.options ?? []) {
      const item = document.createElement('option');
      item.value = option.value;
      item.textContent = option.label;
      control.append(item);
    }
    control.value = String(settingsValues[field.name] ?? field.kind.options?.[0]?.value ?? '');
    control.addEventListener('change', () => settingChanged(field.name, control.value));
    wrapper.append(label, control, help);
    return wrapper;
  }

  if (field.kind.type === 'slider') {
    const rangeRow = makeElement('div', 'range-row');
    control = document.createElement('input');
    control.type = 'range';
    control.min = String(field.kind.min);
    control.max = String(field.kind.max);
    control.step = String(field.kind.step);
    control.value = String(settingsValues[field.name] ?? 0);
    const output = makeElement('output', 'range-value', control.value);
    control.addEventListener('input', () => {
      output.value = control.value;
      output.textContent = control.value;
      settingChanged(field.name, Number(control.value));
    });
    rangeRow.append(control, output);
    wrapper.append(label, rangeRow, help);
    return wrapper;
  }

  if (field.kind.type === 'number') {
    control = document.createElement('input');
    control.type = 'number';
    control.min = String(field.kind.min ?? 0);
    control.max = String(field.kind.max ?? 9999);
    control.value = String(settingsValues[field.name] ?? 0);
    control.addEventListener('input', () => settingChanged(field.name, Number(control.value) || 0));
    wrapper.append(label, control, help);
    return wrapper;
  }

  if (field.kind.type === 'multi-select-pokemon') return renderCustomStarters(field);
  return wrapper;
}

function renderSettings() {
  const root = document.querySelector('#settings-groups');
  root.replaceChildren();
  for (let sectionIndex = 0; sectionIndex < settingsSchema.sections.length; sectionIndex++) {
    const section = settingsSchema.sections[sectionIndex];
    const details = makeElement('details', 'settings-section');
    details.dataset.section = section.id;
    if (sectionIndex === 0) details.open = true;
    const summary = makeElement('summary', 'settings-summary');
    summary.append(makeElement('span', 'settings-section-title', section.label));
    const count = section.groups.reduce((total, group) => total + group.fields.length, 0);
    summary.append(makeElement('span', 'settings-count', `${count} options`));
    details.append(summary);
    details.append(makeElement('p', 'settings-section-help', sectionDescriptions[section.id] ?? 'Customize this part of the game.'));

    const content = makeElement('div', 'settings-section-content');
    for (const group of section.groups) {
      const groupNode = makeElement('section', 'settings-group');
      groupNode.append(makeElement('h3', 'settings-group-title', group.title));
      const fields = makeElement('div', 'settings-fields');
      for (const field of group.fields) {
        if (field.name === 'currentMiscTweaks') continue;
        fields.append(renderControl(field));
      }
      if (section.id === 'misc' && group.title === 'Optional game improvements') {
        const tweakField = group.fields.find(field => field.name === 'currentMiscTweaks');
        if (tweakField) fields.append(renderMiscTweaks());
      }
      groupNode.append(fields);
      content.append(groupNode);
    }
    details.append(content);
    root.append(details);
  }
  updateConditionalFields();
}

function updateConditionalFields() {
  if (!settingsSchema || !settingsValues) return;
  for (const section of settingsSchema.sections) {
    for (const group of section.groups) {
      for (const field of group.fields) {
        const wrapper = document.querySelector(`[data-field="${CSS.escape(field.name)}"]`);
        if (wrapper) wrapper.hidden = !isVisible(field);
        if (field.name === 'limitPokemon') {
          const extra = wrapper?.querySelector('[data-limit-settings]');
          if (extra) extra.hidden = !settingsValues.limitPokemon;
        }
      }
    }
  }
}

function persistSettings() {
  try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsValues)); } catch { /* Storage can be disabled. */ }
}

function readSavedSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || 'null');
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
}

function restoreRecommendedSettings() {
  settingsValues = {
    ...settingsSchema.defaults,
    ...settingsSchema.recommended,
    ...readSavedSettings(),
    generationMask: readSavedSettings().generationMask ?? 127,
    allowEvolutionaryRelatives: readSavedSettings().allowEvolutionaryRelatives ?? false,
  };
  renderSettings();
}

function makeSettingsQuery() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(settingsValues)) {
    if (key === 'updatedFromOldVersion' || key === 'currentRestrictions' || key === 'generationMask' || key === 'allowEvolutionaryRelatives' || value === null || value === undefined) continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const generationMask = Number(settingsValues.generationMask ?? 127) & 127;
  const relativeBit = settingsValues.allowEvolutionaryRelatives ? 128 : 0;
  params.set('currentRestrictions', String(generationMask | relativeBit));
  return params.toString();
}

async function loadSettings() {
  try {
    const response = await fetch('/settings-schema.json?v=2026-11-23', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load settings (${response.status}). Refresh and try again.`);
    settingsSchema = await response.json();
    restoreRecommendedSettings();
    settingsReady = true;
  } catch (error) {
    document.querySelector('#settings-groups').textContent = error?.message || 'Could not load randomizer settings.';
    say(error?.message || 'Could not load randomizer settings.', true);
  }
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadJarIntoMemory(url, destination) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Could not load the randomizer engine (${response.status}). Refresh the page and try again.`);
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

document.querySelector('#reset-settings').addEventListener('click', () => {
  settingsValues = { ...settingsSchema.defaults, ...settingsSchema.recommended, generationMask: 127, allowEvolutionaryRelatives: false };
  persistSettings();
  renderSettings();
});

document.querySelector('#toggle-settings').addEventListener('click', event => {
  const details = [...document.querySelectorAll('.settings-section')];
  const openAll = details.some(section => !section.open);
  details.forEach(section => { section.open = openAll; });
  event.currentTarget.textContent = openAll ? 'Collapse all' : 'Expand all';
});

button.addEventListener('click', async () => {
  if (!chosenRom || !settingsReady) return;
  const label = button.querySelector('span:first-child');
  button.disabled = true;
  label.textContent = 'Starting browser engine…';
  say('Starting Java in this tab. The first start can take a little longer.');

  try {
    if (!runtimeReady) {
      await cheerpjInit({ version: 21 });
      await loadJarIntoMemory('/browser-tools.jar?v=full-settings-2026-11-23', '/str/browser-tools.jar');
      await loadJarIntoMemory('/PokeRandoZX.jar', '/str/PokeRandoZX.jar');
      runtimeReady = true;
    }

    label.textContent = 'Preparing game…';
    say('Loading your ROM into the browser sandbox. The game file is not sent to the website.');

    const { file, ext } = chosenRom;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = `/str/pocket-rom${ext}`;
    const outputPath = ext === '.3ds' ? `/files/${id}-randomized-layeredfs.zip` : `/files/${id}-randomized${ext}`;
    const workingPath = `/files/${id}-layeredfs`;
    cheerpOSAddStringFile(inputPath, new Uint8Array(await file.arrayBuffer()));
    const settingsQuery = makeSettingsQuery();

    label.textContent = 'Randomizing…';
    say('Randomizing in your browser. Keep this tab open.');
    const code = await cheerpjRunMain(
      'BrowserRunner',
      '/str/browser-tools.jar:/str/PokeRandoZX.jar',
      inputPath,
      ext,
      settingsQuery,
      outputPath,
      workingPath,
    );

    let runStatus;
    try { runStatus = (await (await cjFileBlob(`${outputPath}.status`)).text()).trim(); }
    catch { throw new Error(`The engine ended without a result status (exit code ${code}). Please retry; if it repeats, the ROM may not be supported.`); }
    if (runStatus.startsWith('ERROR:')) throw new Error(runStatus.slice('ERROR:'.length).trim());
    if (!runStatus.startsWith('OK')) throw new Error(`The engine returned an unexpected result (exit code ${code}). Please try again.`);
    if (code !== 0) throw new Error(`Randomizer stopped with code ${code}. Check that this ROM is supported.`);

    label.textContent = 'Preparing download…';
    say('Randomization finished. Preparing your download…');
    const result = await cjFileBlob(outputPath);
    if (!result || result.size === 0) throw new Error('The randomizer finished but did not create an output file. Check that this ROM is supported and try again.');
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const downloadName = ext === '.3ds' ? `${baseName}-randomized-layeredfs.zip` : `${baseName}-randomized${ext}`;
    downloadBlob(result, downloadName);
    say('Done! Your randomized game has downloaded. Keep the original as a backup.');
  } catch (error) {
    say(error?.message || 'Randomization failed. Check that this ROM is supported.', true);
  } finally {
    label.textContent = 'Randomize game';
    syncButton();
  }
});

loadSettings();
