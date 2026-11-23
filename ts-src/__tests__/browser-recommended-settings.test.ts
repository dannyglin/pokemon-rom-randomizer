import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Values = Record<string, unknown>;
type Field = { name: string; kind: { type: string; options?: { value: string; label: string }[] } };
type Schema = { defaults: Values; recommended: Values; sections: { groups: { fields: Field[] }[] }[] };
const readBrowserFile = (path: string) => readFileSync(new URL(`../../browser-version/${path}`, import.meta.url), "utf8");
const schema: Schema = JSON.parse(readBrowserFile("settings-schema.json"));
const fields = schema.sections.flatMap(section => section.groups.flatMap(group => group.fields));
const profile = { ...schema.defaults, ...schema.recommended };
const storageKey = "pocket-randomizer-settings-v2";

const checkedSettings = [
  "updateBaseStats", "standardizeEXPCurves", "allowWonderGuard",
  "changeImpossibleEvolutions", "makeEvolutionsEasier", "removeTimeBasedEvolutions",
  "allowStarterAltFormes", "allowStaticAltFormes",
  "randomizeInGameTradesNicknames", "randomizeInGameTradesItems", "updateMoves",
  "rivalCarriesStarterThroughout", "trainersBlockLegendaries", "trainersBlockEarlyWonderGuard",
  "trainersForceFullyEvolved", "allowTrainerAlternateFormes", "swapTrainerMegaEvos", "shinyChance",
  "randomizeWildPokemonHeldItems", "allowWildAltFormes",
  "banBadRandomFieldItems", "banBadRandomShopItems", "banBadRandomPickupItems",
];

const choices: Values = {
  baseStatisticsMod: "UNCHANGED", updateBaseStatsToGeneration: 0,
  selectedEXPCurve: "MEDIUM_FAST", expCurveMod: "ALL", typesMod: "UNCHANGED",
  abilitiesMod: "RANDOMIZE", evolutionsMod: "UNCHANGED", startersMod: "COMPLETELY_RANDOM",
  staticPokemonMod: "RANDOM_MATCHING", inGameTradesMod: "RANDOMIZE_GIVEN_AND_REQUESTED",
  updateMovesToGeneration: 0, movesetsMod: "UNCHANGED", trainersMod: "RANDOM",
  totemPokemonMod: "UNCHANGED", allyPokemonMod: "UNCHANGED", auraMod: "UNCHANGED",
  wildPokemonMod: "RANDOM", wildPokemonRestrictionMod: "NONE",
  tmsMod: "UNCHANGED", tmsHmsCompatibilityMod: "UNCHANGED",
  moveTutorMovesMod: "UNCHANGED", moveTutorsCompatibilityMod: "UNCHANGED",
  fieldItemsMod: "RANDOM", shopItemsMod: "RANDOM", pickupItemsMod: "RANDOM",
};

// A deliberately small DOM fixture runs the shipped script and its real event handlers.
// It does not emulate layout or the CheerpJ ROM runtime.
class Element {
  children: Element[] = [];
  dataset: Record<string, string> = {};
  listeners = new Map<string, (() => void)[]>();
  className = "";
  textContent = "";
  value = "";
  checked = false;
  hidden = false;
  disabled = false;
  type = "";
  classList = { add() {}, remove() {}, toggle() {} };
  constructor(readonly tagName: string) {}
  append(...children: Element[]) { this.children.push(...children); }
  replaceChildren(...children: Element[]) { this.children = children; }
  addEventListener(event: string, listener: () => void) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  }
  dispatch(event: string) { for (const listener of this.listeners.get(event) ?? []) listener(); }
  find(predicate: (element: Element) => boolean): Element | undefined {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const match = child.find(predicate);
      if (match) return match;
    }
  }
  querySelector(selector: string) {
    if (selector === "[data-limit-settings]") return this.find(element => "limitSettings" in element.dataset);
    return this.find(element => element.tagName === selector);
  }
}

async function loadApp(scriptPath: string, saved?: string, storageDisabled = false) {
  const roots = new Map<string, Element>();
  for (const id of ["rom-file", "dropzone", "randomize", "status-message", "settings-groups", "reset-settings", "toggle-settings"]) {
    roots.set(`#${id}`, new Element("div"));
  }
  const storage = new Map<string, string>();
  if (saved !== undefined) storage.set(storageKey, saved);
  const context = createContext({
    URLSearchParams,
    CSS: { escape: (value: string) => value },
    document: {
      createElement: (tag: string) => new Element(tag),
      createTextNode: (text: string) => Object.assign(new Element("#text"), { textContent: text }),
      querySelector: (selector: string) => {
        if (roots.has(selector)) return roots.get(selector);
        const field = selector.match(/^\[data-field="(.+)"\]$/)?.[1];
        return roots.get("#settings-groups")!.find(element => element.dataset.field === field);
      },
    },
    localStorage: {
      getItem: (key: string) => { if (storageDisabled) throw new Error("Storage disabled"); return storage.get(key) ?? null; },
      setItem: (key: string, value: string) => { if (storageDisabled) throw new Error("Storage disabled"); storage.set(key, value); },
    },
    fetch: async () => ({ ok: true, json: async () => structuredClone(schema) }),
  });
  // The script ends with loadSettings(); its completion is the evaluation result.
  await runInContext(readBrowserFile(scriptPath), context);
  expect(runInContext("settingsReady", context), roots.get("#status-message")!.textContent).toBe(true);
  return {
    roots, storage,
    values: () => JSON.parse(runInContext("JSON.stringify(settingsValues)", context)) as Values,
    query: () => new URLSearchParams(runInContext("makeSettingsQuery()", context)),
    field: (name: string) => roots.get("#settings-groups")!.find(element => element.dataset.field === name)!,
  };
}

describe("browser recommended profile", () => {
  it("keeps the deployment schema and script in sync with the browser source", () => {
    expect(readBrowserFile("site/settings-schema.json")).toBe(readBrowserFile("settings-schema.json"));
    expect(readBrowserFile("site/app.js")).toBe(readBrowserFile("app.js"));
  });

  it("changes recommendations without changing the shared neutral defaults", () => {
    // Fingerprint of the original full defaults, not of the recommendations.
    expect(createHash("sha256").update(JSON.stringify(schema.defaults)).digest("hex"))
      .toBe("c40fa554d6bc591ede5588c69fca4296431eecf37889b251b370a04b071d1905");
  });

  it("enables exactly the requested checkboxes and leaves every other checkbox off", () => {
    const checkboxes = fields.filter(field => field.kind.type === "checkbox");
    expect(checkboxes.filter(field => profile[field.name] === true).map(field => field.name).sort())
      .toEqual([...checkedSettings].sort());
    for (const field of checkboxes) expect(profile[field.name], field.name).toBe(checkedSettings.includes(field.name));
  });

  it("uses every requested mode, retaining unchanged evolutions and level-up moves", () => {
    for (const field of fields.filter(field => ["radio", "select"].includes(field.kind.type))) {
      expect(choices, `Missing choice assertion for ${field.name}`).toHaveProperty(field.name);
      expect(profile[field.name], field.name).toBe(choices[field.name]);
    }
  });

  it("uses the specified numeric values and only the two running tweaks", () => {
    const nonzero: Values = { guaranteedMoveCount: 2, minimumCatchRateLevel: 1, trainersForceFullyEvolvedLevel: 34, currentMiscTweaks: 262160 };
    for (const field of fields.filter(field => ["slider", "number"].includes(field.kind.type))) {
      expect(profile[field.name], field.name).toBe(nonzero[field.name] ?? 0);
    }
    expect(profile.customStarters).toEqual([0, 0, 0]);
    expect(profile.currentMiscTweaks).toBe((1 << 4) | (1 << 18));
  });
});

for (const scriptPath of ["app.js", "site/app.js"]) {
  describe(`${scriptPath} preference lifecycle`, () => {
    it("loads recommendations for a new user without requiring a ROM", async () => {
      const app = await loadApp(scriptPath);
      expect(app.values()).toEqual({ ...profile, generationMask: 127, allowEvolutionaryRelatives: false });
      expect(app.values().evolutionsMod).toBe("UNCHANGED");
      expect(app.values().movesetsMod).toBe("UNCHANGED");
      expect(app.roots.get("#randomize")!.disabled).toBe(true);
      expect(app.storage.has(storageKey)).toBe(false);
    });

    it("preserves returning users' saved choices, including false and zero", async () => {
      const saved = { abilitiesMod: "UNCHANGED", trainersForceFullyEvolved: false, trainersForceFullyEvolvedLevel: 50,
        evolutionsMod: "RANDOM", movesetsMod: "COMPLETELY_RANDOM", generationMask: 0,
        allowEvolutionaryRelatives: true, currentMiscTweaks: 0, limitPokemon: true };
      const serialized = JSON.stringify(saved);
      const app = await loadApp(scriptPath, serialized);
      expect(app.values()).toMatchObject(saved);
      expect(app.storage.get(storageKey)).toBe(serialized);
    });

    it("restores and saves recommendations instead of reapplying saved preferences", async () => {
      const app = await loadApp(scriptPath, JSON.stringify({ evolutionsMod: "RANDOM", movesetsMod: "COMPLETELY_RANDOM",
        generationMask: 1, allowEvolutionaryRelatives: true, currentMiscTweaks: 0 }));
      app.roots.get("#reset-settings")!.dispatch("click");
      expect(app.values()).toEqual({ ...profile, generationMask: 127, allowEvolutionaryRelatives: false });
      expect(JSON.parse(app.storage.get(storageKey)!)).toEqual(app.values());
      const reloaded = await loadApp(scriptPath, app.storage.get(storageKey));
      expect(reloaded.values()).toEqual(app.values());
    });

    it("keeps recommendations editable and serializes the user's edits", async () => {
      const app = await loadApp(scriptPath);
      const abilities = app.field("abilitiesMod").querySelector("select")!;
      expect(abilities.disabled).toBe(false);
      expect(abilities.value).toBe("RANDOMIZE");
      abilities.value = "UNCHANGED";
      abilities.dispatch("change");
      const level = app.field("trainersForceFullyEvolvedLevel").querySelector("input")!;
      level.value = "40";
      level.dispatch("input");
      expect(app.values()).toMatchObject({ abilitiesMod: "UNCHANGED", trainersForceFullyEvolvedLevel: 40 });
      expect(JSON.parse(app.storage.get(storageKey)!)).toEqual(app.values());
      expect(app.query().get("abilitiesMod")).toBe("UNCHANGED");
      expect(app.query().get("trainersForceFullyEvolvedLevel")).toBe("40");
      expect(app.query().get("customStarters")).toBe("0,0,0");
    });

    it("resolves Latest only for the engine and retains the UI and saved sentinel", async () => {
      const app = await loadApp(scriptPath);
      for (const name of ["updateBaseStatsToGeneration", "updateMovesToGeneration"]) {
        expect(app.values()[name]).toBe(0);
        expect(app.field(name).querySelector("select")!.value).toBe("0");
        expect(app.query().get(name)).toBe("9");
      }
      app.roots.get("#reset-settings")!.dispatch("click");
      expect(JSON.parse(app.storage.get(storageKey)!)).toMatchObject({ updateBaseStatsToGeneration: 0, updateMovesToGeneration: 0 });
    });

    it.each(["6", "7", "8"])("passes explicit generation %s through without changing saved choices", async generation => {
      const saved = JSON.stringify({ updateBaseStatsToGeneration: generation, updateMovesToGeneration: generation });
      const app = await loadApp(scriptPath, saved);
      expect(app.query().get("updateBaseStatsToGeneration")).toBe(generation);
      expect(app.query().get("updateMovesToGeneration")).toBe(generation);
      expect(app.storage.get(storageKey)).toBe(saved);
      const latest = app.field("updateMovesToGeneration").querySelector("select")!;
      latest.value = "0";
      latest.dispatch("change");
      expect(app.query().get("updateMovesToGeneration")).toBe("9");
      expect(app.values().updateMovesToGeneration).toBe("0");
    });

    it("selects all generations but does not enable generation restrictions until requested", async () => {
      const app = await loadApp(scriptPath);
      const limiter = app.field("limitPokemon");
      const toggle = limiter.querySelector("input")!;
      const options = limiter.querySelector("[data-limit-settings]")!;
      expect(toggle.checked).toBe(false);
      expect(options.hidden).toBe(true);
      for (let bit = 0; bit < 7; bit++) {
        expect(options.find(element => element.dataset.generationBit === String(bit))!.checked).toBe(true);
      }
      expect(app.query().get("currentRestrictions")).toBe("127");
      expect(app.query().get("limitPokemon")).toBe("false");
      toggle.checked = true;
      toggle.dispatch("change");
      expect(options.hidden).toBe(false);
      expect(app.query().get("limitPokemon")).toBe("true");
    });

    it.each(["{broken", "null", "false"])("falls back to recommendations for invalid saved data %s", async saved => {
      const app = await loadApp(scriptPath, saved);
      expect(app.values()).toEqual({ ...profile, generationMask: 127, allowEvolutionaryRelatives: false });
    });

    it("can load, edit and restore settings when browser storage is disabled", async () => {
      const app = await loadApp(scriptPath, undefined, true);
      const checkbox = app.field("allowWonderGuard").querySelector("input")!;
      checkbox.checked = false;
      checkbox.dispatch("change");
      expect(app.values().allowWonderGuard).toBe(false);
      app.roots.get("#reset-settings")!.dispatch("click");
      expect(app.values().allowWonderGuard).toBe(true);
    });
  });
}
