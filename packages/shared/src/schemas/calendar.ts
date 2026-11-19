import { z } from 'zod';

export const calendarTimeZone = 'America/Havana';
export const reservationStates = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;
const visibility = z.enum(['PRIVATE', 'PUBLIC']);
const timestamp = z.number().int().min(0).max(Date.UTC(2100, 0, 1));
const title = z.string().trim().min(3).max(160);
const note = z.string().trim().min(1).max(2000);
const optionalNote = note.nullable().optional();
const slot = { startAt: timestamp, endAt: timestamp };
const validSlot = ({ startAt, endAt }: z.infer<z.ZodObject<typeof slot>>) => endAt - startAt >= 15 * 60_000 && endAt - startAt <= 7 * 86_400_000;

export const calendarRangeSchema = z.object({ from: z.coerce.number().pipe(timestamp), to: z.coerce.number().pipe(timestamp) })
  .refine(({ from, to }) => to > from && to - from <= 45 * 86_400_000, 'Selecciona un rango de hasta 45 días');
export const calendarEventInputSchema = z.strictObject({ ...slot, title, visibility, publicDescription: optionalNote, internalNotes: optionalNote })
  .refine(validSlot, { path: ['endAt'], message: 'El evento debe durar entre 15 minutos y 7 días' });
export const calendarRequestInputSchema = z.strictObject({ ...slot, title, purpose: note, attendees: z.number().int().min(1).max(10000), notes: optionalNote })
  .refine(validSlot, { path: ['endAt'], message: 'La reserva debe durar entre 15 minutos y 7 días' });
export const calendarRequestListSchema = z.object({
  status: z.enum(reservationStates).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const calendarApproveSchema = z.strictObject({ publicTitle: title, note: optionalNote, publicDescription: optionalNote });
export const calendarRejectSchema = z.strictObject({ note });
export const calendarPublicEventSchema = z.object({ ...slot, id: z.uuid(), type: z.literal('VIDEOCONFERENCE'), title, publicDescription: note.nullable() });
export const calendarAdminEventSchema = calendarPublicEventSchema.extend({ visibility, internalNotes: note.nullable(), cancelledAt: timestamp.nullable(), requestId: z.uuid().nullable() });
export const calendarRequestSchema = z.object({
  ...slot, id: z.uuid(), title, purpose: note, attendees: z.number().int(), notes: note.nullable(),
  status: z.enum(reservationStates), decisionNote: note.nullable(), decidedAt: timestamp.nullable(), createdAt: timestamp,
  event: z.object({ ...slot, id: z.uuid(), cancelledAt: timestamp.nullable() }).nullable(),
});
export const calendarReviewRequestSchema = calendarRequestSchema.extend({ requester: z.object({ id: z.uuid(), displayName: z.string() }) });
export type CalendarRange = z.infer<typeof calendarRangeSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventInputSchema>;
export type CalendarRequestInput = z.infer<typeof calendarRequestInputSchema>;
export type CalendarRequestList = z.infer<typeof calendarRequestListSchema>;
export type CalendarApprove = z.infer<typeof calendarApproveSchema>;
export type CalendarReject = z.infer<typeof calendarRejectSchema>;
export type CalendarEvent = z.infer<typeof calendarPublicEventSchema>;
export type CalendarAdminEvent = z.infer<typeof calendarAdminEventSchema>;
export type CalendarRequest = z.infer<typeof calendarRequestSchema>;
export type CalendarReviewRequest = z.infer<typeof calendarReviewRequestSchema>;
