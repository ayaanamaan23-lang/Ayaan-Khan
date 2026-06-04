export interface BadgeLevel {
  name: string;
  emoji: string;
  minPoints: number;
  color: string;
  next: number | null;
}

export const BADGE_LEVELS: BadgeLevel[] = [
  { name: "Newcomer",  emoji: "🌱", minPoints: 0,  color: "#6b7280", next: 1  },
  { name: "Observer",  emoji: "📍", minPoints: 1,  color: "#60a5fa", next: 5  },
  { name: "Reporter",  emoji: "🏅", minPoints: 5,  color: "#fbbf24", next: 10 },
  { name: "Guardian",  emoji: "🛡️", minPoints: 10, color: "#34d399", next: 25 },
  { name: "Sentinel",  emoji: "⭐", minPoints: 25, color: "#a78bfa", next: 50 },
  { name: "Protector", emoji: "🏆", minPoints: 50, color: "#f59e0b", next: null },
];

export function getBadge(trustPoints: number): BadgeLevel {
  for (let i = BADGE_LEVELS.length - 1; i >= 0; i--) {
    if (trustPoints >= BADGE_LEVELS[i].minPoints) {
      return BADGE_LEVELS[i];
    }
  }
  return BADGE_LEVELS[0];
}

export function getProgressToNext(trustPoints: number): number {
  const badge = getBadge(trustPoints);
  if (!badge.next) return 100;
  const prev = badge.minPoints;
  return Math.round(((trustPoints - prev) / (badge.next - prev)) * 100);
}
