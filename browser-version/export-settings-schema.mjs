import { writeFile } from "node:fs/promises";
import { FORM_TABS, DEFAULT_VALUES } from "../web/lib/form-schema.ts";

const sectionLabels = {
  "pokemon-traits": "Pokémon & evolutions",
  "starters-statics-trades": "Starters, gifts & trades",
  "moves-movesets": "Moves & learnsets",
  trainers: "Trainer battles",
  wild: "Wild encounters",
  "tms-tutors": "TMs, HMs & tutors",
  items: "Items & shops",
  misc: "Game tweaks & general options",
};

const groupLabels = {
  "Pokemon Base Statistics": "Stats & growth",
  "Pokemon Types": "Types",
  "Pokemon Abilities": "Abilities",
  "Pokemon Evolutions": "Evolutions",
  "Starter Pokemon": "Starter Pokémon",
  "Static Pokemon": "Gift and fixed encounters",
  "In-Game Trades": "In-game trades",
  "Move Data": "Move properties",
  "Pokemon Movesets": "Level-up moves",
  "Trainer Pokemon": "Trainer teams",
  "Trainer Pokemon Held Items": "Trainer held items",
  "Totem Pokemon": "Totem battles",
  "Wild Pokemon": "Wild encounters",
  "TMs & HMs": "TM and HM moves",
  "Move Tutors": "Move tutor moves",
  "Field Items": "Items found in the world",
  "Shop Items": "Shop inventory",
  "Pickup Items": "Items found by Pokémon",
  "General Options": "Whole-game rules",
  "Misc Tweaks": "Optional game improvements",
};

const labelOverrides = {
  baseStatisticsMod: "Change Pokémon stats",
  baseStatsFollowEvolutions: "Keep stat changes consistent across evolutions",
  baseStatsFollowMegaEvolutions: "Keep stat changes consistent with Mega Evolutions",
  assignEvoStatsRandomly: "Give each evolution its own stat changes",
  updateBaseStats: "Use newer-generation stats",
  updateBaseStatsToGeneration: "Update stats to",
  standardizeEXPCurves: "Use a shared experience-growth rate",
  selectedEXPCurve: "Experience-growth rate",
  expCurveMod: "Apply this to",
  typesMod: "Change Pokémon types",
  typesFollowMegaEvolutions: "Keep types consistent with Mega Evolutions",
  dualTypeOnly: "Give every Pokémon two types",
  abilitiesMod: "Change Pokémon abilities",
  allowWonderGuard: "Allow Wonder Guard on randomized Pokémon",
  abilitiesFollowEvolutions: "Keep abilities consistent across evolutions",
  abilitiesFollowMegaEvolutions: "Keep abilities consistent with Mega Evolutions",
  banTrappingAbilities: "Exclude abilities that prevent switching",
  banNegativeAbilities: "Exclude abilities with only negative effects",
  banBadAbilities: "Exclude weak or harmful abilities",
  weighDuplicateAbilitiesTogether: "Treat duplicate ability slots as one choice",
  ensureTwoAbilities: "Give each Pokémon two different abilities when possible",
  evolutionsMod: "Change evolution lines",
  evosSimilarStrength: "Keep replacement evolutions at similar strength",
  evosSameTyping: "Prefer evolutions with the same type",
  evosMaxThreeStages: "Keep evolution lines to three stages or fewer",
  evosForceChange: "Make sure each changed evolution is different",
  evosAllowAltFormes: "Include alternate forms as evolutions",
  changeImpossibleEvolutions: "Replace evolutions that are impossible in this game",
  makeEvolutionsEasier: "Make difficult evolutions easier to trigger",
  removeTimeBasedEvolutions: "Remove evolutions that require a time of day",
  startersMod: "Change the starter choices",
  customStarters: "Choose your own starters",
  randomizeStartersHeldItems: "Randomize starter held items",
  banBadRandomStarterHeldItems: "Exclude poor starter held items",
  staticPokemonMod: "Change gift and fixed Pokémon",
  inGameTradesMod: "Change in-game trades",
  randomizeMovePowers: "Randomize move power",
  randomizeMoveAccuracies: "Randomize move accuracy",
  randomizeMovePPs: "Randomize move PP",
  randomizeMoveTypes: "Randomize move types",
  randomizeMoveCategory: "Randomize physical/special categories",
  updateMoves: "Use updated move data",
  updateMovesToGeneration: "Update moves to",
  movesetsMod: "Change level-up moves",
  startWithGuaranteedMoves: "Give Pokémon a useful starting moveset",
  guaranteedMoveCount: "Starting moves per Pokémon",
  reorderDamagingMoves: "Place damaging moves later in the learnset",
  movesetsForceGoodDamaging: "Ensure some damaging moves are included",
  movesetsGoodDamagingPercent: "Minimum share of damaging moves",
  blockBrokenMovesetMoves: "Exclude moves that can break the game",
  evolutionMovesForAll: "Let all Pokémon learn evolution moves",
  trainersMod: "Change trainer teams",
  rivalCarriesStarterThroughout: "Keep the rival’s starter on their team",
  trainersUsePokemonOfSimilarStrength: "Match the original Pokémon’s strength",
  trainersMatchTypingDistribution: "Keep a similar mix of types on each team",
  trainersBlockLegendaries: "Exclude legendary Pokémon from trainer teams",
  trainersBlockEarlyWonderGuard: "Prevent early trainers from getting Wonder Guard",
  trainersForceFullyEvolved: "Give high-level trainers fully evolved Pokémon",
  trainersForceFullyEvolvedLevel: "Fully evolved Pokémon start at level",
  trainersLevelModified: "Adjust trainer Pokémon levels",
  trainersLevelModifier: "Trainer level adjustment",
  wildPokemonMod: "Change wild encounters",
  wildPokemonRestrictionMod: "Limit the random choices",
  blockWildLegendaries: "Exclude legendary Pokémon from wild encounters",
  useMinimumCatchRate: "Make Pokémon easier to catch",
  minimumCatchRateLevel: "Minimum catch rate",
  wildLevelsModified: "Adjust wild Pokémon levels",
  wildLevelModifier: "Wild level adjustment",
  tmsMod: "Change TM and HM moves",
  keepFieldMoveTMs: "Keep required field moves as TMs",
  fullHMCompat: "Let every Pokémon learn every HM",
  tmsHmsCompatibilityMod: "Choose who can learn each TM/HM",
  moveTutorMovesMod: "Change move tutor moves",
  moveTutorsCompatibilityMod: "Choose who can learn each tutor move",
  fieldItemsMod: "Change items found in the world",
  shopItemsMod: "Change shop inventories",
  pickupItemsMod: "Change items found by Pokémon",
  blockBrokenMoves: "Exclude game-breaking moves everywhere",
  limitPokemon: "Limit which generations can appear",
  banIrregularAltFormes: "Exclude unusual battle-only forms",
  randomizeTrainerNames: "Randomize trainer names",
  randomizeTrainerClassNames: "Randomize trainer classes",
  staticLevelModified: "Adjust gift and fixed Pokémon levels",
  staticLevelModifier: "Gift/fixed Pokémon level adjustment",
  wildPokemonRestrictionMod: "Choose encounter rules",
};

const optionOverrides = {
  baseStatisticsMod: {
    SHUFFLE: "Shuffle each Pokémon’s stats (same total strength)",
    RANDOM: "Randomize each stat (can change total strength)",
  },
  typesMod: {
    RANDOM_FOLLOW_EVOLUTIONS: "Randomize types; usually keep them through evolutions",
    COMPLETELY_RANDOM: "Fully random types; evolutions can change type too",
  },
  evolutionsMod: {
    RANDOM: "Random evolutions",
    RANDOM_EVERY_LEVEL: "Randomize each step in the evolution line",
  },
  startersMod: {
    COMPLETELY_RANDOM: "Any Pokémon can be a starter",
    RANDOM_WITH_TWO_EVOLUTIONS: "Choose starters that can evolve twice",
  },
  movesetsMod: {
    RANDOM_PREFER_SAME_TYPE: "Random moves, usually matching the Pokémon’s type",
    COMPLETELY_RANDOM: "Completely random moves from the full move pool",
    METRONOME_ONLY: "Only learn Metronome",
  },
  trainersMod: {
    RANDOM: "Fully random teams",
    DISTRIBUTED: "Random teams spread Pokémon across trainers",
    MAINPLAYTHROUGH: "Randomize the main story trainers",
    TYPE_THEMED: "Give each trainer a type theme",
    TYPE_THEMED_ELITE4_GYMS: "Type themes for Gyms and the Elite Four",
  },
  wildPokemonMod: {
    RANDOM: "Fully random encounters; no strength matching",
    AREA_MAPPING: "Keep encounter slots similar within each area",
    GLOBAL_MAPPING: "Use one shared mapping across the game",
  },
  wildPokemonRestrictionMod: {
    NONE: "No strength or type restrictions",
    SIMILAR_STRENGTH: "Choose Pokémon of similar strength",
    CATCH_EM_ALL: "Spread choices so more species can be caught",
    TYPE_THEME_AREAS: "Give each area a type theme",
  },
  staticPokemonMod: {
    RANDOM_MATCHING: "Randomize, keeping legendary status similar",
    COMPLETELY_RANDOM: "Any Pokémon can replace a gift or fixed encounter",
    SIMILAR_STRENGTH: "Choose replacements of similar strength",
  },
  trainersForceFullyEvolvedLevel: {},
};

const helpText = {
  baseStatisticsMod: "Change how much a Pokémon’s HP, Attack, Defense, and other stats can change.",
  abilitiesMod: "Give Pokémon different abilities. The engine keeps Wonder Guard’s special rules in mind.",
  allowWonderGuard: "Wonder Guard makes a Pokémon immune to most attacks. Allowing it can make some battles much harder.",
  evosSimilarStrength: "When enabled, replacements stay close to the original evolution’s strength. Leave off for fully random evolutions.",
  trainersUsePokemonOfSimilarStrength: "When enabled, trainer Pokémon stay close to the original strength. Leave off for fully random teams.",
  trainersForceFullyEvolved: "Once a trainer’s Pokémon reaches the level below, use a final evolution when one is available.",
  trainersForceFullyEvolvedLevel: "This is the level at which the game starts using final evolutions for trainers.",
  wildPokemonMod: "Choose how wild encounter slots are replaced. The unrestricted random option ignores strength matching.",
  wildPokemonRestrictionMod: "Extra restrictions for wild choices. ‘No restrictions’ gives the most unpredictable results.",
  movesetsMod: "Choose the moves Pokémon learn as they level up. Completely random uses the full move pool without type matching.",
  blockBrokenMoves: "Avoid moves the randomizer identifies as game-breaking in learnsets, TMs, and tutor lists.",
  limitPokemon: "When enabled, choose which generations can appear in randomized Pokémon pools.",
  currentMiscTweaks: "Optional changes to game behavior. Each tweak is applied only in games that support it.",
  baseStatsFollowEvolutions: "Use the base Pokémon’s stat changes as a guide for its evolutions.",
  baseStatsFollowMegaEvolutions: "Keep Mega Evolution stat changes related to the regular form.",
  assignEvoStatsRandomly: "Roll separate stats for each evolution instead of carrying the base form’s roll forward.",
  updateBaseStats: "Update existing Pokémon to newer official stats; this does not add new species.",
  standardizeEXPCurves: "Give selected Pokémon the same experience growth curve to make leveling more consistent.",
  typesFollowMegaEvolutions: "Keep a Mega Evolution related to the regular form’s randomized type.",
  dualTypeOnly: "Make randomized Pokémon dual-type instead of allowing single types.",
  abilitiesFollowEvolutions: "Give a Pokémon’s regular evolutions related randomized abilities.",
  abilitiesFollowMegaEvolutions: "Keep Mega Evolution abilities related to the regular form.",
  banTrappingAbilities: "Avoid Arena Trap, Magnet Pull, and Shadow Tag in new ability slots.",
  banNegativeAbilities: "Avoid abilities whose main effect is harmful to their user.",
  banBadAbilities: "Avoid abilities the randomizer classifies as poor choices.",
  weighDuplicateAbilitiesTogether: "Reduce the chance of an ability appearing twice in the same Pokémon’s slots.",
  ensureTwoAbilities: "Try to give Pokémon two distinct ability choices where the game supports it.",
  evosSameTyping: "Prefer replacement evolutions that keep the original Pokémon’s type.",
  evosMaxThreeStages: "Avoid creating evolution lines longer than three Pokémon.",
  evosForceChange: "Prevent a Pokémon from keeping its original evolution when possible.",
  evosAllowAltFormes: "Allow alternate forms in evolution choices where the game supports them.",
  changeImpossibleEvolutions: "Replace trade or other hard-to-trigger evolutions with alternatives available in this game.",
  makeEvolutionsEasier: "Lower difficult evolution requirements where the game supports the change.",
  removeTimeBasedEvolutions: "Remove requirements that an evolution happen at a particular time of day.",
  randomizeStartersHeldItems: "Give randomized held items to the starter choices.",
  banBadRandomStarterHeldItems: "Keep poor or unusable items off randomized starters.",
  allowStarterAltFormes: "Allow alternate forms to be selected as starters.",
  allowStaticAltFormes: "Allow alternate forms for gifts and fixed encounters.",
  swapStaticMegaEvos: "When possible, swap Mega-capable Pokémon with other Mega-capable Pokémon.",
  limitMainGameLegendaries: "Avoid using too many legendary Pokémon in the main story’s fixed encounters.",
  limit600: "Keep Pokémon with a 600-point base-stat total out of this random pool.",
  staticLevelModified: "Change the levels of gift Pokémon and other fixed encounters.",
  correctStaticMusic: "Update encounter music to match the randomized fixed Pokémon when supported.",
  randomizeInGameTradesNicknames: "Give traded Pokémon new nicknames.",
  randomizeInGameTradesOTs: "Give traded Pokémon new original-trainer names.",
  randomizeInGameTradesIVs: "Randomize the traded Pokémon’s individual values.",
  randomizeInGameTradesItems: "Randomize items held by Pokémon received in trades.",
  randomizeMovePowers: "Change how much damage moves can deal.",
  randomizeMoveAccuracies: "Change the chance that moves hit their target.",
  randomizeMovePPs: "Change how many times moves can be used before they need to be restored.",
  randomizeMoveTypes: "Change the elemental type assigned to moves.",
  randomizeMoveCategory: "Change whether moves use physical or special damage rules.",
  updateMoves: "Apply newer move data where supported by this game.",
  updateMovesLegacy: "Use compatibility-focused values when updating older move data.",
  startWithGuaranteedMoves: "Give randomized learnsets a small useful starting moveset.",
  reorderDamagingMoves: "Place damaging moves later so early levels are less punishing.",
  movesetsForceGoodDamaging: "Ensure randomized learnsets include damaging moves at the chosen percentage.",
  blockBrokenMovesetMoves: "Keep moves considered game-breaking out of level-up learnsets.",
  evolutionMovesForAll: "Allow Pokémon to learn moves normally reserved for evolving.",
  rivalCarriesStarterThroughout: "Keep the rival’s starter on their team throughout the story.",
  trainersMatchTypingDistribution: "Keep roughly the same type mix as each trainer’s original team.",
  trainersBlockLegendaries: "Keep legendary Pokémon out of randomized trainer teams.",
  trainersBlockEarlyWonderGuard: "Avoid giving early trainers Pokémon with Wonder Guard.",
  trainersEnforceDistribution: "Reduce repeated Pokémon across the randomized trainer teams.",
  trainersEnforceMainPlaythrough: "Spread choices across the main story so trainer teams vary more.",
  randomizeTrainerNames: "Replace trainer names with randomized names.",
  randomizeTrainerClassNames: "Replace trainer classes, such as Hiker or Lass, with randomized classes.",
  trainersLevelModified: "Raise or lower trainer Pokémon levels by the selected amount.",
  allowTrainerAlternateFormes: "Allow alternate forms on trainer teams.",
  swapTrainerMegaEvos: "Prefer replacing a trainer’s Mega-capable Pokémon with another Mega-capable Pokémon.",
  doubleBattleMode: "Change supported trainer battles to use double-battle rules.",
  shinyChance: "Give trainer Pokémon a chance to appear shiny.",
  betterTrainerMovesets: "Improve movesets for trainer Pokémon where supported.",
  randomizeHeldItemsForBossTrainerPokemon: "Give randomized held items to major boss trainers’ Pokémon.",
  randomizeHeldItemsForImportantTrainerPokemon: "Give randomized held items to important story trainers’ Pokémon.",
  randomizeHeldItemsForRegularTrainerPokemon: "Give randomized held items to regular trainers’ Pokémon.",
  consumableItemsOnlyForTrainerPokemon: "Choose only items that trainers can use up during battle.",
  sensibleItemsOnlyForTrainerPokemon: "Avoid held items that are unlikely to help in battle.",
  highestLevelOnlyGetsItemsForTrainerPokemon: "Give each trainer’s held item to their highest-level Pokémon only.",
  randomizeTotemHeldItems: "Randomize held items for Totem Pokémon in supported games.",
  allowTotemAltFormes: "Allow alternate forms for Totem Pokémon.",
  totemLevelsModified: "Raise or lower Totem Pokémon levels by the selected amount.",
  useTimeBasedEncounters: "Keep morning, day, and night encounter tables separate where supported.",
  blockWildLegendaries: "Keep legendary Pokémon out of wild encounters.",
  useMinimumCatchRate: "Set a floor for how easy wild Pokémon are to catch.",
  randomizeWildPokemonHeldItems: "Randomize items held by wild Pokémon.",
  banBadRandomWildPokemonHeldItems: "Keep poor or unusable items off wild Pokémon.",
  balanceShakingGrass: "Balance shaking-grass encounters with the regular area encounters.",
  wildLevelsModified: "Raise or lower wild Pokémon levels by the selected amount.",
  allowWildAltFormes: "Allow alternate forms in wild encounters.",
  tmLevelUpMoveSanity: "Avoid TMs that duplicate moves Pokémon already learn early.",
  keepFieldMoveTMs: "Keep key field moves available as TMs where the game supports it.",
  fullHMCompat: "Let every Pokémon learn every HM.",
  tmsForceGoodDamaging: "Keep a share of randomized TMs as useful damaging moves.",
  blockBrokenTMMoves: "Keep moves considered game-breaking out of randomized TMs.",
  tmsFollowEvolutions: "Keep TM compatibility related across a Pokémon’s evolution line.",
  tutorLevelUpMoveSanity: "Avoid tutor moves that duplicate moves Pokémon already learn early.",
  keepFieldMoveTutors: "Keep key field moves available from move tutors where supported.",
  tutorsForceGoodDamaging: "Keep a share of randomized tutor moves as useful damaging moves.",
  blockBrokenTutorMoves: "Keep moves considered game-breaking out of the tutor list.",
  tutorFollowEvolutions: "Keep tutor compatibility related across a Pokémon’s evolution line.",
  banBadRandomFieldItems: "Keep poor or unusable items out of ground and hidden pickups.",
  banBadRandomShopItems: "Keep poor or unusable items out of shop inventories.",
  banRegularShopItems: "Exclude common items from randomized shops.",
  banOPShopItems: "Exclude unusually powerful items from randomized shops.",
  balanceShopPrices: "Adjust shop prices to better match randomized item values.",
  guaranteeEvolutionItems: "Keep evolution items available after shop randomization.",
  guaranteeXItems: "Keep battle-stat booster items available in shops.",
  banBadRandomPickupItems: "Keep poor or unusable items out of Pokémon pickup pools.",
  raceMode: "Enable settings useful for races, including a shareable check value and fewer randomization logs.",
  banIrregularAltFormes: "Exclude forms that normally only appear during battle transformations.",
};

function inferDependencies(predicate, defaults) {
  const dependencies = new Set();
  const probe = new Proxy({}, {
    get(_target, key) {
      const name = String(key);
      dependencies.add(name);
      const value = defaults[name];
      if (typeof value === "boolean") return true;
      if (typeof value === "number") return 1;
      return "__randomizer_probe__";
    },
  });
  try { predicate(probe); } catch { /* A probe need not satisfy every predicate. */ }
  return [...dependencies];
}

const allFields = FORM_TABS.flatMap((tab) => tab.groups.flatMap((group) => group.fields));
const domains = Object.fromEntries(allFields.map((field) => {
  if (field.kind.type === "radio" || field.kind.type === "select") {
    return [field.name, [...new Set([DEFAULT_VALUES[field.name], ...field.kind.options.map((option) => option.value)])]];
  }
  if (field.kind.type === "checkbox") return [field.name, [false, true]];
  if (field.kind.type === "slider" || field.kind.type === "number") {
    return [field.name, [...new Set([DEFAULT_VALUES[field.name], field.kind.min, field.kind.max])]];
  }
  return [field.name, [DEFAULT_VALUES[field.name]]];
}));

function conditionTable(predicate) {
  const keys = inferDependencies(predicate, DEFAULT_VALUES);
  const table = {};
  const values = { ...DEFAULT_VALUES };
  const visit = (index) => {
    if (index === keys.length) {
      table[JSON.stringify(keys.map((key) => values[key]))] = Boolean(predicate(values));
      return;
    }
    const key = keys[index];
    for (const choice of domains[key] ?? [DEFAULT_VALUES[key]]) {
      values[key] = choice;
      visit(index + 1);
    }
    values[key] = DEFAULT_VALUES[key];
  };
  visit(0);
  return { keys, table };
}

const sections = FORM_TABS.map((tab) => ({
  id: tab.id,
  label: sectionLabels[tab.id] ?? tab.label,
  groups: tab.groups.map((group) => ({
    title: groupLabels[group.title] ?? group.title,
    fields: group.fields.map((field) => {
      const output = {
        ...field,
        label: labelOverrides[field.name] ?? field.label.replaceAll("Pokemon", "Pokémon").replaceAll("Pokemon", "Pokémon"),
        kind: { ...field.kind, options: field.kind.options?.map((option) => ({
          ...option,
          label: optionOverrides[field.name]?.[option.value] ?? option.label.replaceAll("Pokemon", "Pokémon"),
        })) },
        help: helpText[field.name] ?? field.help ?? "Turn this on to apply this optional rule during randomization.",
      };
      if (typeof field.showIf === "function") output.when = conditionTable(field.showIf);
      delete output.showIf;
      return output;
    }),
  })),
}));

const schema = {
  sections,
  defaults: DEFAULT_VALUES,
  recommended: {
    startersMod: "COMPLETELY_RANDOM",
    evolutionsMod: "RANDOM",
    evosSimilarStrength: false,
    trainersMod: "RANDOM",
    trainersUsePokemonOfSimilarStrength: false,
    trainersForceFullyEvolved: true,
    trainersForceFullyEvolvedLevel: 30,
    wildPokemonMod: "RANDOM",
    wildPokemonRestrictionMod: "NONE",
    blockWildLegendaries: false,
  },
};

const json = `${JSON.stringify(schema, null, 2)}\n`;
await writeFile(new URL("./settings-schema.json", import.meta.url), json);
await writeFile(new URL("./site/settings-schema.json", import.meta.url), json);
