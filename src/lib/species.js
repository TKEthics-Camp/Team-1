// Tree species catalog — chosen once when a hobby is planted (see
// OrbSheet.jsx), then read by Tree.jsx to decide leaf shape, canopy
// silhouette, bark texture, and healthy-state colour. Unhealthy states
// (wilting/bare/dead) intentionally share one universal "decaying" look
// across every species — a neglected tree browns and dries out regardless
// of what species it is; only a *healthy* tree shows its species character.
export const SPECIES = [
  {
    id: "oak", name: ["Oak", "橡树"],
    leaf: "oval", canopy: "round", bark: "rough",
    healthy: ["#9FE070", "#5FBF4A", "#2E7D3A"],
  },
  {
    id: "maple", name: ["Maple", "枫树"],
    leaf: "maple", canopy: "round", bark: "smooth",
    healthy: ["#FFC24D", "#E8793C", "#A83A22"],
  },
  {
    id: "cherry", name: ["Cherry blossom", "樱花树"],
    leaf: "blossom", canopy: "round", bark: "smooth",
    healthy: ["#FFE3EE", "#FFB0CE", "#E888AE"],
  },
  {
    id: "pine", name: ["Pine", "松树"],
    leaf: "needle", canopy: "conical", bark: "tall",
    healthy: ["#6FBFA0", "#3D8F6E", "#1F5C42"],
  },
  {
    id: "willow", name: ["Willow", "柳树"],
    leaf: "willow", canopy: "weeping", bark: "smooth",
    healthy: ["#C7E88A", "#9BCB5E", "#6B9C3C"],
  },
  {
    id: "birch", name: ["Birch", "白桦树"],
    leaf: "oval", canopy: "round", bark: "banded",
    healthy: ["#D9F0A8", "#A8D66E", "#7CAE48"],
  },
  {
    // A tight, narrow cone rather than pine's broader one — same "conical"
    // canopy generator, just squeezed in with a radiusScale.
    id: "cypress", name: ["Cypress", "柏树"],
    leaf: "needle", canopy: "conical", bark: "tall", radiusScale: 0.5,
    healthy: ["#7FBF8A", "#4F9C63", "#255C3C"],
  },
  {
    // Palm and bamboo don't have a "canopy" in the usual sense at all — Tree.jsx
    // special-cases `form` into its own drawing instead of the leaf-scatter path.
    id: "palm", name: ["Palm", "棕榈树"],
    form: "palm", bark: "tall",
    healthy: ["#8FD98A", "#5FB85E", "#357A3E"],
  },
  {
    id: "bamboo", name: ["Bamboo", "竹子"],
    form: "bamboo", leaf: "willow",
    healthy: ["#C6E86A", "#94C93E", "#5F8F28"],
  },
];

export const DEFAULT_SPECIES = "oak";

export function speciesOf(id) {
  return SPECIES.find((s) => s.id === id) || SPECIES[0];
}
