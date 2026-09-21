'use client';

import { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';
import { type Appointment, type AppointmentStatus } from '@/lib/types';
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/lib/appointments-db';
import { formatDate, formatTime, getAppointmentStatusColor, getToday, toLocalDateString } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { StatCard } from '@/components/ui/Card';
import AppointmentForm from '@/components/forms/AppointmentForm';
import { useToast } from '@/contexts/ToastContext';
import {
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  User,
  CheckCircle2,
  XCircle,
  Bell,
  BellRing,
  List,
  LayoutGrid,
  RefreshCw,
  Trash2,
  AlertCircle,
} from 'lucide-react';

type ViewMode = 'list' | 'calendar';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

function getStatusIcon(status: AppointmentStatus) {
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case 'pending':
      return <Clock className="h-3.5 w-3.5" />;
    case 'cancelled':
      return <XCircle className="h-3.5 w-3.5" />;
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}

function getWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCalendarBlockColor(status: AppointmentStatus) {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    case 'pending':
      return 'bg-amber-50 border-amber-200 text-amber-800';
    case 'cancelled':
      return 'bg-rose-50 border-rose-200 text-rose-800';
    case 'completed':
      return 'bg-slate-50 border-slate-200 text-slate-600';
  }
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const { showToast } = useToast();

  const today = getToday();

  async function loadAppointments() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchAppointments();
      setAppointments(data);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  // Stats
  const todayCount = useMemo(
    () => appointments.filter((a) => a.date === today && a.status !== 'cancelled').length,
    [appointments, today]
  );

  const weekDates = useMemo(() => getWeekDates(), []);
  const weekStart = toLocalDateString(weekDates[0]);
  const weekEnd = toLocalDateString(weekDates[6]);

  const weekCount = useMemo(
    () => appointments.filter((a) => a.date >= weekStart && a.date <= weekEnd && a.status !== 'cancelled').length,
    [appointments, weekStart, weekEnd]
  );

  const pendingCount = useMemo(
    () => appointments.filter((a) => a.status === 'pending').length,
    [appointments]
  );

  // Filtered list
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];
    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }
    return filtered.sort((a, b) => {
      const dateA = `${a.date}T${a.time}`;
      const dateB = `${b.date}T${b.time}`;
      return dateA.localeCompare(dateB);
    });
  }, [appointments, statusFilter]);

  // Actions
  async function confirmAppointment(id: string) {
    try {
      const updated = await updateAppointment(id, { status: 'confirmed' });
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(`Appointment confirmed for ${updated.leadName}`, 'success');
    } catch (err: any) {
      showToast('Failed to confirm appointment', 'error');
    }
  }

  async function cancelAppointment(id: string) {
    try {
      const updated = await updateAppointment(id, { status: 'cancelled' });
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(`Appointment cancelled for ${updated.leadName}`, 'warning');
    } catch (err: any) {
      showToast('Failed to cancel appointment', 'error');
    }
  }

  async function sendReminder(id: string) {
    try {
      const updated = await updateAppointment(id, { reminderSent: true });
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(`SMS Reminder simulated to ${updated.leadName} (Demo Mode)`, 'info');
    } catch (err: any) {
      showToast('Failed to send reminder', 'error');
    }
  }

  async function handleNewAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'reminderSent'>) {
    try {
      const created = await createAppointment(appointment);
      setAppointments((prev) => [created, ...prev]);
      setIsFormOpen(false);
      showToast(`New appointment scheduled for ${created.leadName}`, 'success');
    } catch (err: any) {
      showToast('Failed to create appointment', 'error');
    }
  }

  async function handleReschedule(appointment: Appointment) {
    try {
      const updated = await updateAppointment(appointment.id, {
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        notes: appointment.notes,
        status: appointment.status,
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? updated : a))
      );
      setRescheduleTarget(null);
      showToast(`Appointment rescheduled for ${updated.leadName}`, 'success');
    } catch (err: any) {
      showToast('Failed to reschedule appointment', 'error');
    }
  }

  async function handleDeleteAppointment(id: string) {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await deleteAppointment(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      showToast('Appointment deleted successfully', 'success');
    } catch (err: any) {
      showToast('Failed to delete appointment', 'error');
    }
  }

  // Calendar view helpers
  function getAppointmentsForDate(dateStr: string) {
    return appointments.filter((a) => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your schedule and bookings</p>
        </div>
        <Button variant="primary" onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Appointment
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Calendar className="h-5 w-5 text-indigo-600" />}
          label="Today"
          value={isLoading ? '...' : String(todayCount)}
          className="border border-indigo-100 bg-indigo-50/30"
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
          label="This Week"
          value={isLoading ? '...' : String(weekCount)}
          className="border border-blue-100 bg-blue-50/30"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Pending Confirmation"
          value={isLoading ? '...' : String(pendingCount)}
          className="border border-amber-100 bg-amber-50/30"
        />
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* View toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setView('list')}
            className={clsx(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              view === 'list'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <List className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={clsx(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              view === 'calendar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Calendar
          </button>
        </div>

        {view === 'list' && (
          <div className="w-full sm:w-48">
            <Select
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse flex items-start gap-4">
              <div className="w-16 h-16 bg-slate-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border-2 border-rose-100 bg-rose-50/50 p-6 text-center max-w-xl mx-auto">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-semibold text-rose-800">Database Connection Error</h3>
          <p className="text-sm text-rose-600 mt-1">{error}</p>
          <p className="text-xs text-slate-400 mt-3">
            Please make sure you have run the migrations script in the Supabase SQL Editor.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadAppointments}>
            Retry Connection
          </Button>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No appointments found</p>
              <p className="text-sm text-slate-400 mt-1">Try a different filter or create a new appointment</p>
            </div>
          ) : (
            filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className={clsx(
                  'rounded-xl border bg-white p-4 sm:p-5 transition-all hover:shadow-md group',
                  apt.status === 'completed' ? 'border-slate-100 opacity-75' : 'border-slate-200',
                  apt.date === today && apt.status !== 'cancelled' && 'ring-2 ring-indigo-100 border-indigo-200'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Date & Info */}
                  <div className="flex items-start gap-4">
                    {/* Date block */}
                    <div
                      className={clsx(
                        'shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center',
                        apt.date === today && apt.status !== 'cancelled'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      <span className="text-xs font-medium uppercase">
                        {new Date(apt.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-xl font-bold leading-none">
                        {new Date(apt.date + 'T00:00:00').getDate()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{apt.leadName}</h3>
                        <Badge className={getAppointmentStatusColor(apt.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(apt.status)}
                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                          </span>
                        </Badge>
                        {apt.reminderSent && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                            <BellRing className="h-3 w-3" />
                            Reminded
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{apt.service}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(apt.time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {apt.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {apt.leadPhone}
                        </span>
                      </div>
                      {apt.notes && (
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">📝 {apt.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {apt.status === 'pending' && (
                      <Button variant="primary" size="sm" onClick={() => confirmAppointment(apt.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Confirm
                      </Button>
                    )}
                    {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRescheduleTarget(apt)}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Reschedule
                        </Button>
                        {!apt.reminderSent && (
                          <Button variant="ghost" size="sm" onClick={() => sendReminder(apt.id)}>
                            <Bell className="h-3.5 w-3.5 mr-1" />
                            Remind
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => cancelAppointment(apt.id)} title="Cancel Appointment">
                          <XCircle className="h-3.5 w-3.5 text-amber-500 hover:text-amber-600" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAppointment(apt.id)} title="Delete Appointment">
                      <Trash2 className="h-3.5 w-3.5 text-rose-500 hover:text-rose-700" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Calendar View */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {weekDates.map((date, i) => {
              const dateStr = toLocalDateString(date);
              const isToday = dateStr === today;
              return (
                <div
                  key={i}
                  className={clsx(
                    'p-3 text-center border-r border-slate-100 last:border-r-0',
                    isToday && 'bg-indigo-50'
                  )}
                >
                  <p className={clsx('text-xs font-medium', isToday ? 'text-indigo-600' : 'text-slate-500')}>
                    {DAY_NAMES[i]}
                  </p>
                  <p
                    className={clsx(
                      'text-lg font-bold mt-0.5',
                      isToday ? 'text-indigo-700' : 'text-slate-900'
                    )}
                  >
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className="grid grid-cols-7 min-h-[340px]">
            {weekDates.map((date, i) => {
              const dateStr = toLocalDateString(date);
              const isToday = dateStr === today;
              const dayAppointments = getAppointmentsForDate(dateStr);
              return (
                <div
                  key={i}
                  className={clsx(
                    'p-2 border-r border-slate-100 last:border-r-0 space-y-1.5',
                    isToday && 'bg-indigo-50/30 border-l-2 border-l-indigo-500'
                  )}
                >
                  {dayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={clsx(
                        'rounded-lg border p-2 text-xs cursor-default transition-all hover:shadow-sm',
                        getCalendarBlockColor(apt.status)
                      )}
                    >
                      <p className="font-bold">{formatTime(apt.time)}</p>
                      <p className="truncate font-medium mt-0.5">{apt.leadName}</p>
                      <p className="truncate text-[10px] opacity-75">{apt.service}</p>
                    </div>
                  ))}
                  {dayAppointments.length === 0 && (
                    <p className="text-[10px] text-slate-300 text-center mt-4">No appointments</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Appointment">
        <AppointmentForm
          onSubmit={handleNewAppointment}
          onClose={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule Appointment"
      >
        {rescheduleTarget && (
          <AppointmentForm
            initialData={rescheduleTarget}
            onSubmit={handleReschedule}
            onClose={() => setRescheduleTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}
