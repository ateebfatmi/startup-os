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
  atelier: { label: "Founder Atelier", description: "Warm limestone, walnut, brass, and tailored hospitality.", foundation: "#1b231f", floor: "#f0ebe0", promenade: "#e5dfd2", seam: "#ded6c5", rug: "#233d30" },
  biophilic: { label: "Biophilic Studio", description: "Soft sage surfaces and a calm, nature-led working atmosphere.", foundation: "#18251d", floor: "#dfe7d7", promenade: "#cbd9c4", seam: "#b8c8ae", rug: "#315742" },
  midnight: { label: "Midnight Lab", description: "Graphite floors, cool glass, and high-contrast startup energy.", foundation: "#0d1317", floor: "#20282c", promenade: "#2b353a", seam: "#3b474c", rug: "#172d3d" },
};
