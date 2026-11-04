export enum UserRole {
  USER = 'USER',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN',
}

export const ticketStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'] as const;
export const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const boardPermissions = ['VIEW', 'EDIT', 'MANAGE'] as const;
export type TicketStatus = typeof ticketStatuses[number];
export type Priority = typeof priorities[number];
