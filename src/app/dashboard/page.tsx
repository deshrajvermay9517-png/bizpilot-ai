'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Flame,
  Clock,
  Calendar,
  IndianRupee,
  Brain,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import clsx from 'clsx';

import Button from '@/components/ui/Button';
import Card, { StatCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/contexts/ToastContext';

import { mockDashboardStats, mockAIReport } from '@/lib/mock-data';
import { formatCurrency, timeAgo, formatTime, getLeadStatusColor, getScoreColor, getGreeting, getToday } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchLeads } from '@/lib/leads-db';
import { fetchAppointments } from '@/lib/appointments-db';
import { fetchInvoices } from '@/lib/invoices-db';
import type { Lead, Appointment, Invoice } from '@/lib/types';

// ── Action Icons Mapping ──────────────────────────────────────────
function getActionIcon(action: string) {
  if (action.includes('🔥')) return <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />;
  if (action.includes('📞')) return <span className="text-sm flex-shrink-0">📞</span>;
  if (action.includes('💰')) return <span className="text-sm flex-shrink-0">💰</span>;
  if (action.includes('📅')) return <span className="text-sm flex-shrink-0">📅</span>;
  if (action.includes('📱')) return <span className="text-sm flex-shrink-0">📱</span>;
  if (action.includes('🎯')) return <span className="text-sm flex-shrink-0">🎯</span>;
  return <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />;
}

// Revenue is recognized on paidAt when available. createdAt is kept as a
// fallback for invoices created before a payment date was recorded.
function getRevenueDate(invoice: Invoice): Date {
  return new Date(invoice.paidAt || invoice.createdAt);
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingApts, setIsLoadingApts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setIsLoadingApts(true);
        const [leadsData, aptsData, invoicesData] = await Promise.all([
          fetchLeads(),
          fetchAppointments(),
          fetchInvoices(),
        ]);
        setLeads(leadsData);
        setAppointments(aptsData);
        setInvoices(invoicesData);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
        setIsLoadingApts(false);
      }
    }

    loadDashboardData();
  }, []);


  const stats = mockDashboardStats;
  const report = mockAIReport;

  // Real database dynamic stats calculations
  const totalLeadsCount = isLoading ? '...' : String(leads.length);
  const hotLeadsCount = isLoading ? '...' : String(leads.filter((l) => l.status === 'hot').length);
  const pendingFollowUpsCount = isLoading
    ? '...'
    : String(leads.filter((l) => l.status === 'new' || l.status === 'contacted').length);

  // Sort and select the 5 most recent leads from the database
  const recentLeads = isLoading
    ? []
    : [...leads]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

  const today = getToday();
  const todaysAppointmentsList = appointments.filter((a) => a.date === today && a.status !== 'cancelled');
  const todaysAppointmentsCount = isLoadingApts ? '...' : String(todaysAppointmentsList.length);
  const upcomingAppointments = isLoadingApts
    ? []
    : todaysAppointmentsList.length > 0
      ? todaysAppointmentsList
      : appointments.filter((a) => a.status !== 'cancelled').slice(0, 3);

  const revenueCollected = isLoading
    ? 0
    : invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const revenueReportDate = new Date();
  const thisMonthRevenue = isLoading
    ? 0
    : invoices.filter((i) => {
        const revenueDate = getRevenueDate(i);

        return (
          i.status === 'paid' &&
          revenueDate.getMonth() === revenueReportDate.getMonth() &&
          revenueDate.getFullYear() === revenueReportDate.getFullYear()
        );
      })
      .reduce((sum, i) => sum + i.amount, 0);

  // Dynamic Revenue Chart Data
  const revenueData = useMemo(() => {
    const months: { monthName: string; year: number; monthIndex: number; value: number }[] = [];
    const date = new Date();
    // Generate last 5 calendar months in order
    for (let i = 4; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      months.push({
        monthName: d.toLocaleString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        value: 0,
      });
    }

    // Accumulate total amount from paid invoices in these months
    invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        const paidDate = getRevenueDate(inv);
        const m = paidDate.getMonth();
        const y = paidDate.getFullYear();
        const match = months.find((entry) => entry.monthIndex === m && entry.year === y);
        if (match) {
          match.value += inv.amount;
        }
      }
    });

    return months.map((m) => ({
      month: m.monthName,
      value: m.value,
      label: m.value > 0
        ? m.value >= 1000
          ? `₹${(m.value / 1000).toFixed(m.value % 1000 === 0 ? 0 : 1)}K`
          : `₹${m.value}`
        : '₹0',
    }));
  }, [invoices]);

  const maxRevenue = useMemo(() => {
    const vals = revenueData.map((d) => d.value);
    return Math.max(...vals, 1);
  }, [revenueData]);

  const hasPaidInvoices = useMemo(() => {
    return revenueData.some((d) => d.value > 0);
  }, [revenueData]);

  const trendPercentage = useMemo(() => {
    if (revenueData.length < 2) return 0;
    const currentMonthVal = revenueData[revenueData.length - 1].value;
    const prevMonthVal = revenueData[revenueData.length - 2].value;
    if (prevMonthVal === 0) {
      return currentMonthVal > 0 ? 100 : 0;
    }
    return Math.round(((currentMonthVal - prevMonthVal) / prevMonthVal) * 100);
  }, [revenueData]);

  const scoreColor = stats.aiBusinessScore >= 80 ? 'text-emerald-600' : stats.aiBusinessScore >= 60 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening with {profile?.business_name || 'your business'} today.</p>
      </div>

      {/* ── Stats Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-indigo-600" />}
          label="Total Leads"
          value={totalLeadsCount}
          trend={isLoading ? undefined : `Total active`}
          trendUp={!isLoading}
          iconBgClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-600" />}
          label="Hot Leads"
          value={hotLeadsCount}
          trend="🔥"
          trendUp={!isLoading}
          iconBgClass="bg-orange-50 text-orange-600"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Pending Follow-ups"
          value={pendingFollowUpsCount}
          trend="Action needed"
          iconBgClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-blue-600" />}
          label="Today's Appointments"
          value={todaysAppointmentsCount}
          iconBgClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<IndianRupee className="h-5 w-5 text-emerald-600" />}
          label="Revenue Collected"
          value={isLoading ? '...' : formatCurrency(revenueCollected)}
          trend={isLoading ? undefined : `+${formatCurrency(thisMonthRevenue)} this month`}
          trendUp={thisMonthRevenue > 0}
          iconBgClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={<Brain className="h-5 w-5 text-purple-600" />}
          label="AI Business Score"
          value={`${stats.aiBusinessScore}/100`}
          className={scoreColor}
          iconBgClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── AI Daily Summary Card ────────────────────── */}
      <div className="relative rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-white via-indigo-50/40 to-blue-50/60 p-6 shadow-sm overflow-hidden">
        {/* Decorative gradient circles */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-100/50 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-100/50 blur-2xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-100">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">AI Daily Insights</h2>
            <Badge className="bg-indigo-100 text-indigo-700 text-xs">Auto-generated</Badge>
          </div>

          <p className="text-slate-600 leading-relaxed mb-4">{report.summary}</p>

          <div className="space-y-2 mb-4">
            {report.suggestedActions.slice(0, 3).map((action, idx) => (
              <button
                key={idx}
                onClick={() => showToast(`Executing action: "${action}" (Simulated/Demo Mode)`, 'info')}
                className="w-full text-left flex items-start gap-3 rounded-lg bg-white/70 backdrop-blur-sm border border-slate-100 hover:border-indigo-200 px-4 py-3 transition-all hover:bg-white hover:shadow-sm"
              >
                {getActionIcon(action)}
                <span className="text-sm text-slate-700">{action}</span>
              </button>
            ))}
          </div>

          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View Full Report <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── Two‑Column Layout ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Recent Leads ────────────────────────────── */}
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Leads</h3>
            <Link href="/dashboard/leads" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className={clsx(
            "divide-y divide-slate-50",
            (isLoading || error || recentLeads.length === 0) && "min-h-[200px] flex flex-col justify-center"
          )}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 px-6 py-3.5 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-12" />
                  <div className="h-4 bg-slate-200 rounded w-8" />
                </div>
              ))
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-xs text-rose-500 font-semibold mb-1">Failed to load recent leads</p>
                <p className="text-xs text-slate-400">{error}</p>
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Users className="h-8 w-8 text-slate-300" />}
                  title="No leads yet"
                  description="Your CRM is empty. Add your first lead!"
                  action={
                    <Link href="/dashboard/leads">
                      <Button variant="primary" size="sm">
                        Go to Leads CRM
                      </Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/80 transition-colors group"
                >
                  <Avatar name={lead.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {lead.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{lead.serviceInterested || 'No service'}</p>
                  </div>
                  <Badge className={clsx('text-xs', getLeadStatusColor(lead.status))}>
                    {lead.status}
                  </Badge>
                  <span className={clsx('text-sm font-semibold tabular-nums', getScoreColor(lead.score))}>
                    {lead.score}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:block">{timeAgo(lead.updatedAt)}</span>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* ── Upcoming Appointments ──────────────────── */}
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Today&apos;s Schedule</h3>
            <Link href="/dashboard/appointments" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className={clsx(
            "divide-y divide-slate-50",
            (isLoadingApts || error || upcomingAppointments.length === 0) && "min-h-[200px] flex flex-col justify-center"
          )}>
            {isLoadingApts ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-4 px-6 py-3.5 animate-pulse">
                  <div className="flex flex-col items-center min-w-[52px] space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-8" />
                    <div className="h-3 bg-slate-200 rounded w-10" />
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-12" />
                </div>
              ))
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-xs text-rose-500 font-semibold mb-1">Failed to load schedule</p>
                <p className="text-xs text-slate-400">{error}</p>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Calendar className="h-10 w-10 text-slate-300" />}
                  title="No appointments today"
                  description="Your schedule is clear. Book some demos!"
                />
              </div>
            ) : (
              upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex flex-col items-center min-w-[52px]">
                    <span className="text-sm font-semibold text-indigo-600">{formatTime(apt.time)}</span>
                    <span className="text-[10px] text-slate-400">{apt.duration}min</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{apt.leadName}</p>
                    <p className="text-xs text-slate-400 truncate">{apt.service}</p>
                  </div>
                  <Badge className={clsx(
                    'text-xs capitalize',
                    apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    apt.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    apt.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                    'bg-rose-100 text-rose-700'
                  )}>
                    {apt.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>


      {/* ── Revenue Overview ─────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-900">Revenue Overview</h3>
            <p className="text-sm text-slate-400 mt-0.5">Last 5 months</p>
          </div>
          {hasPaidInvoices ? (
            <div className={clsx(
              'flex items-center gap-1.5 text-sm font-medium',
              trendPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'
            )}>
              <TrendingUp className={clsx('h-4 w-4', trendPercentage < 0 && 'rotate-180')} />
              {trendPercentage >= 0 ? `+${trendPercentage}%` : `${trendPercentage}%`} vs last month
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              No revenue trend
            </div>
          )}
        </div>

        {!hasPaidInvoices && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center gap-2 text-sm text-slate-500">
            <TrendingUp className="h-4 w-4 text-slate-400 animate-pulse" />
            <span>No paid invoice data yet. Mark invoices as paid to see revenue trends.</span>
          </div>
        )}

        <div className={clsx(
          'flex items-end justify-between gap-3 sm:gap-6 h-48',
          !mounted && 'opacity-0'
        )}>
          {revenueData.map((d, idx) => {
            const heightPercent = (d.value / maxRevenue) * 100;
            return (
              <div key={d.month} className="flex flex-col items-center flex-1 h-full justify-end">
                <span className="text-xs font-semibold text-slate-600 mb-1.5">{d.label}</span>
                <div
                  className={clsx(
                    'w-full max-w-[56px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-700 ease-out relative group cursor-default',
                    mounted ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{
                    height: mounted ? `${heightPercent}%` : '0%',
                    transitionDelay: `${idx * 100}ms`,
                  }}
                >
                  {/* Hover tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {formatCurrency(d.value)}
                  </div>
                  {/* Shine effect */}
                  <div className="absolute inset-0 rounded-t-lg bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
                <span className="text-xs text-slate-500 mt-2 font-medium">{d.month}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
