/** Locale-aware medium date + short time, e.g. for note created/updated stamps. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
