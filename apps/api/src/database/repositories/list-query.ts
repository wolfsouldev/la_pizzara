import { sql, type AnyColumn } from 'drizzle-orm';
// Bind the escape character as a value: template-literal escaping must not
// accidentally produce an empty SQL ESCAPE expression. User text stays bound.
export function contains(column: AnyColumn, value: string) {
  const escaped = value.replace(/[\\%_]/g, c => `\\${c}`);
  return sql`${column} like ${`%${escaped}%`} escape ${'\\'}`;
}
