export enum UserRole {
  USER = 'USER',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/** SUPER_ADMIN is an explicit elevation and includes every role's capabilities. */
export function roleMatches(role: UserRole, allowed: readonly UserRole[]): boolean {
  return role === UserRole.SUPER_ADMIN || allowed.includes(role);
}

export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export const ticketStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'] as const;
export const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const boardPermissions = ['VIEW', 'EDIT', 'MANAGE'] as const;
export type TicketStatus = typeof ticketStatuses[number];
export type Priority = typeof priorities[number];
