import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns';

export function formatDateIST(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'dd MMM yyyy, hh:mm a');
  } catch {
    return dateStr;
  }
}

export function formatTimeOnly(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'hh:mm a');
  } catch {
    return dateStr;
  }
}

export function formatDueText(dueAtISO: string): { text: string; isOverdue: boolean } {
  try {
    const dueDate = parseISO(dueAtISO);
    // A plain date ("2026-09-26") is due by the end of that day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueAtISO)) {
      dueDate.setHours(23, 59, 59, 999);
    }
    const now = new Date();

    if (isAfter(now, dueDate)) {
      return {
        text: `Overdue by ${formatDistanceToNow(dueDate)}`,
        isOverdue: true,
      };
    } else {
      return {
        text: `Due in ${formatDistanceToNow(dueDate)}`,
        isOverdue: false,
      };
    }
  } catch {
    return { text: 'Due soon', isOverdue: false };
  }
}

export function minutesSince(iso?: string | null, until?: string | null): number {
  if (!iso) return 0;
  const end = until ? new Date(until).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(iso).getTime()) / 60000));
}
