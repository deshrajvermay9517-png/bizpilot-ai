// ============================================================
// BizPilot AI — Utility Functions
// ============================================================

import { type LeadStatus, type InvoiceStatus, type AppointmentStatus } from './types';

/**
 * Format a number as Indian Rupee currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string to readable format
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

/**
 * Format time string (e.g., "10:00" -> "10:00 AM")
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get color classes for lead status badges
 */
export function getLeadStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-amber-100 text-amber-700',
    hot: 'bg-orange-100 text-orange-700',
    booked: 'bg-indigo-100 text-indigo-700',
    paid: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-slate-100 text-slate-500',
  };
  return colors[status];
}

/**
 * Get color classes for invoice status badges
 */
export function getInvoiceStatusColor(status: InvoiceStatus): string {
  const colors: Record<InvoiceStatus, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    unpaid: 'bg-amber-100 text-amber-700',
    overdue: 'bg-rose-100 text-rose-700',
  };
  return colors[status];
}

/**
 * Get color classes for appointment status badges
 */
export function getAppointmentStatusColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    confirmed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-rose-100 text-rose-700',
    completed: 'bg-slate-100 text-slate-600',
  };
  return colors[status];
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export { getToday, toLocalDateString } from './local-date';

/**
 * Calculate lead score color
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-rose-600';
}

/**
 * Get score background gradient
 */
export function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-emerald-600';
  if (score >= 60) return 'from-amber-500 to-amber-600';
  if (score >= 40) return 'from-orange-500 to-orange-600';
  return 'from-rose-500 to-rose-600';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Regrex Validation for Phone Number
 */
export function isValidIndianPhoneNumber(phone: string): boolean {
  return /^(\+91)?[6-9]\d{9}$/.test(phone.replace(/\s/g, ""));
}

export function normalizeIndianPhoneNumber(phone: string): string {
  const value = phone.replace(/\s/g, '');

  if (value.startsWith('+91')) {
    return value;
  }

  return `+91${value}`;
}