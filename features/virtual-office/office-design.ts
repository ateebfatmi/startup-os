export type OfficeTheme = "atelier" | "biophilic" | "midnight";

export type OfficeDesignSettings = {
  theme: OfficeTheme;
  accentColor: string;
  terraceEnabled: boolean;
  plantsEnabled: boolean;
};

export const DEFAULT_OFFICE_DESIGN: OfficeDesignSettings = {
  theme: "atelier",
  accentColor: "#c9a562",
  terraceEnabled: true,
  plantsEnabled: true,
};

export const OFFICE_THEME_PALETTES: Record<OfficeTheme, {
  label: string;
  description: string;
  foundation: string;
  floor: string;
  promenade: string;
  seam: string;
  rug: string;
}> = {
  atelier: { label: "Founder Atelier", description: "Warm limestone, walnut, brass, and tailored hospitality.", foundation: "#222a25", floor: "#f6f1e7", promenade: "#ede6d7", seam: "#ded4c3", rug: "#334c41" },
  biophilic: { label: "Biophilic Studio", description: "Soft sage surfaces and a calm, nature-led working atmosphere.", foundation: "#1c2820", floor: "#eff4ea", promenade: "#dde8d6", seam: "#c9d8c2", rug: "#385e4a" },
  midnight: { label: "Midnight Lab", description: "Graphite floors, cool glass, and high-contrast startup energy.", foundation: "#0e151a", floor: "#1b2328", promenade: "#253138", seam: "#33424a", rug: "#223d50" },
};
