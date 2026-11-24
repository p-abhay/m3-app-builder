import type { FontKey } from "./types.ts";

export interface FontDefinition {
  key: FontKey;
  label: string;
  category: string;
  family: string;
  google?: string;
}

export const FONTS: FontDefinition[] = [
  {
    key: "roboto",
    label: "Roboto",
    category: "Android Default",
    family: "Roboto, system-ui, sans-serif",
  },
  {
    key: "robotoFlex",
    label: "Roboto Flex",
    category: "Variable Sans",
    family: "'Roboto Flex', Roboto, system-ui, sans-serif",
    google: "Roboto+Flex:wght@400;500;600;700",
  },
  {
    key: "robotoSerif",
    label: "Roboto Serif",
    category: "Editorial Serif",
    family: "'Roboto Serif', Georgia, serif",
    google: "Roboto+Serif:wght@400;500;600;700",
  },
  {
    key: "inter",
    label: "Inter",
    category: "Geometric UI",
    family: "'Inter', system-ui, sans-serif",
    google: "Inter:wght@400;500;600;700",
  },
  {
    key: "poppins",
    label: "Poppins",
    category: "Friendly Rounded",
    family: "'Poppins', system-ui, sans-serif",
    google: "Poppins:wght@400;500;600;700",
  },
  {
    key: "outfit",
    label: "Outfit",
    category: "Expressive Display",
    family: "'Outfit', system-ui, sans-serif",
    google: "Outfit:wght@400;500;600;700",
  },
  {
    key: "system",
    label: "System UI",
    category: "Device Native",
    family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
];

export const fontFamilyOf = (key: FontKey): string =>
  FONTS.find((f) => f.key === key)?.family ?? FONTS[0].family;

const loadedFonts = new Set<FontKey>();

/** Dynamically inject a Google Fonts stylesheet the first time a typeface is selected. */
export function ensureFontLoaded(key: FontKey, onReady?: () => void): void {
  if (typeof document === "undefined") return;
  const def = FONTS.find((f) => f.key === key);
  const ready = () => document.fonts?.ready.then(() => onReady?.());

  if (!def?.google || loadedFonts.has(key)) {
    ready();
    return;
  }

  loadedFonts.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${def.google}&display=swap`;
  link.onload = () => {
    const face = def.family.split(",")[0].trim().replace(/^'|'$/g, "");
    Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 16px "${face}"`))).then(
      ready,
      ready,
    );
  };
  document.head.appendChild(link);
}
