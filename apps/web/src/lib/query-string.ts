export function queryString(values: Record<string, string | number | undefined>) {
  const q = new URLSearchParams(); for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') q.set(key, String(value)); return q.toString();
}
