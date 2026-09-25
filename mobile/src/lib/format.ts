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
