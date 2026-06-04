export type Category = "Traffic" | "Power" | "ATM" | "Internet" | "Fire/Emergency" | "Water" | "Other";

export const CATEGORIES: Category[] = [
  "Traffic",
  "Power",
  "ATM",
  "Internet",
  "Fire/Emergency",
  "Water",
  "Other",
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Fire/Emergency": "#ef4444",
  "Traffic": "#f97316",
  "Power": "#eab308",
  "Water": "#3b82f6",
  "Internet": "#8b5cf6",
  "ATM": "#22c55e",
  "Other": "#6b7280",
};

export const CATEGORY_ICONS: Record<string, string> = {
  "Traffic": "🚗",
  "Power": "⚡",
  "ATM": "💳",
  "Internet": "📶",
  "Fire/Emergency": "🔥",
  "Water": "💧",
  "Other": "⚠️",
};

export function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["Other"];
}

export function getCategoryIcon(cat: string): string {
  return CATEGORY_ICONS[cat] ?? CATEGORY_ICONS["Other"];
}
