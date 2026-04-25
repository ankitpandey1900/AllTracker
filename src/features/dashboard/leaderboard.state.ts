import { GlobalProfile } from '@/types/profile.types';

export const LB_PAGE_SIZE = 5;
export let lbCurrentPage = 1;
export let lbAllUsers: GlobalProfile[] = [];

export function setLbCurrentPage(page: number): void {
  lbCurrentPage = page;
}

export function setLbAllUsers(users: GlobalProfile[]): void {
  lbAllUsers = users;
}
