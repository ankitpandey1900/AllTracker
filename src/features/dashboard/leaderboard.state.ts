import { GlobalProfile } from '@/types/profile.types';

export const LB_PAGE_SIZE = 11;
export let lbCurrentPage = 1;
export let lbAllUsers: GlobalProfile[] = [];
export let lbTimeframe: 'today' | 'weekly' | 'monthly' | 'all-time' = 'weekly';

export function setLbCurrentPage(page: number): void {
  lbCurrentPage = page;
}

export function setLbTimeframe(timeframe: 'today' | 'weekly' | 'monthly' | 'all-time'): void {
  lbTimeframe = timeframe;
}

export function setLbAllUsers(users: GlobalProfile[]): void {
  lbAllUsers = users;
}
