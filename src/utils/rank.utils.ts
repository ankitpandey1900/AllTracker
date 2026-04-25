import { RANK_TIERS } from '@/config/constants';

/** 
 * Returns the professional Title based on cumulative study hours.
 */
export function getRankTitle(totalHours: number): string {
  if (totalHours >= 20000) return 'SINGULARITY';
  if (totalHours >= 10000) return 'DEITY';
  if (totalHours >= 5000)  return 'ETERNAL';
  if (totalHours >= 2500)  return 'LEGEND';
  if (totalHours >= 1200)  return 'ELITE';
  if (totalHours >= 600)   return 'VETERAN';
  if (totalHours >= 300)   return 'CAPTAIN';
  if (totalHours >= 150)   return 'COMMANDER';
  if (totalHours >= 70)    return 'OFFICER';
  if (totalHours >= 30)    return 'PILOT';
  if (totalHours >= 10)    return 'CADET';
  return 'RECRUIT';
}

/**
 * Legacy/Fine-grained titles (matches the smaller scale used in some UI components)
 */
export function getDetailedRankTitle(totalHours: number): string {
  if (totalHours >= 20000) return 'SINGULARITY';
  if (totalHours >= 10000) return 'DEITY';
  if (totalHours >= 5000) return 'ETERNAL';
  if (totalHours >= 2500) return 'LEGEND';
  if (totalHours >= 1200) return 'ELITE';
  if (totalHours >= 600) return 'VETERAN';
  if (totalHours >= 300) return 'CAPTAIN';
  if (totalHours >= 150) return 'COMMANDER';
  if (totalHours >= 70) return 'OFFICER';
  if (totalHours >= 30) return 'PILOT';
  if (totalHours >= 10) return 'CADET';
  return 'RECRUIT';
}

/**
 * Returns the themed color for a given rank name.
 */
export function getRankColor(rankName: string): string {
  const tier = RANK_TIERS.find(t => t.name === rankName.toUpperCase());
  return tier ? tier.color : '#71717a';
}
