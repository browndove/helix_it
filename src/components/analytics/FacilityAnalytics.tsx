'use client';

/**
 * Facility-scoped port of anax's Usage Summary page (src/app/page.tsx).
 *
 * Differences vs. anax:
 *   – No sidebar (internal admin already has its own).
 *   – Tab switching moved inline above the content.
 *   – Data fetched from /api/proxy/analytics?facility_id=<id> (internal-admin
 *     token may scope to any facility via the client hint).
 *
 * The analytics UI itself (KPIs, charts, grid, colors) is NOT modified.
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import clsx from 'clsx';
import { FaUsers, FaEnvelope, FaArrowTrendUp, FaShieldHalved } from 'react-icons/fa6';
import {
    KpiCard,
    RevenueChart,
    RoleCriticalTraffic,
    ServiceDistribution,
    DailyPatientFlow,
    RedZoneAlerts,
    LiveUpdates,
    RoleMetricsModal,
} from '@/components/ugmc-dashboard/executive-overview/components';
import CalendarRangePicker from '@/components/CalendarRangePicker';
import { appendUsageMetricsRange } from '@/lib/usage-metrics-range';

const PatientInsightPage = lazy(() => import('@/components/ugmc-dashboard/patient-insight/PatientInsightPage'));
const BillingFinancePage = lazy(() => import('@/components/ugmc-dashboard/billing-finance/BillingFinancePage'));

type DashboardTab = 'executive' | 'patient' | 'billing';
const TAB_LABELS: Record<DashboardTab, string> = {
    executive: 'Usage Summary',
    patient: 'Response Performance',
    billing: 'Staffing & Coverage',
};

export interface AnalyticsData {
    active_users_count: number;
    active_users_rate_percent: number;
    registered_staff_count: number;
    total_messages: number;
    critical_messages: number;
    critical_messages_rate_percent: number;
    standard_messages: number;
    escalation_rate_percent: number;
    escalated_critical_messages: number;
    escalation_rate_of_total_messages_percent: number;
    role_fill_rate_percent: number;
    filled_roles: number;
    total_roles: number;
    critical_role_fill_rate_percent: number;
    critical_filled_roles: number;
    critical_total_roles: number;
    avg_critical_ack_minutes: number;
    avg_first_read_minutes_all: number;
    avg_first_read_minutes_critical: number;
    avg_first_read_minutes_non_critical: number;
    total_calls_made: number;
    window_days: number;
    avg_sign_in_minutes_since_midnight_utc: number;
    avg_sign_out_minutes_since_midnight_utc: number;
    daily_message_volume: { day: string; total_messages: number; critical_messages: number; standard_messages: number }[];
    department_metrics: {
        department_name: string;
        department_id?: string;
        role_fill_rate_percent: number;
        escalation_rate_vs_dept_critical_messages_percent: number;
        filled_roles: number;
        total_roles: number;
        critical_messages_sent: number;
        avg_critical_ack_minutes: number;
        avg_reply_response_minutes_all?: number;
        avg_reply_response_minutes_critical?: number;
        escalation_notifications: number;
        critical_filled_roles: number;
        critical_total_roles: number;
        critical_role_fill_rate_percent: number;
    }[];
    top_escalated_roles: { role_name: string; role_id: string; escalation_count: number }[];
    least_escalated_roles: { role_name: string; role_id: string; escalation_count: number }[];
    role_metrics?: { role_id: string; role_name: string; department_id: string; department_name: string; priority: string; filled: boolean; role_fill_rate_percent: number; critical_total_roles: number; critical_filled_roles: number; critical_role_fill_rate_percent: number; total_messages: number; total_calls_made: number; critical_messages: number; standard_messages: number; critical_messages_rate_percent: number; escalated_critical_messages: number; escalation_rate_percent: number; escalation_rate_of_total_messages_percent: number; avg_critical_ack_minutes: number; avg_reply_response_minutes_all: number; avg_reply_response_minutes_critical: number }[];
}

function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

export type FacilityAnalyticsProps = {
    /**
     * Facility id to scope the analytics to. If omitted, the proxy falls back
     * to the session's resolved facility (helix-facility cookie / auth/me).
     */
    facilityId?: string;
};

export default function FacilityAnalytics({ facilityId }: FacilityAnalyticsProps) {
    const [activeTab, setActiveTab] = useState<DashboardTab>('executive');
    const [tabMounted, setTabMounted] = useState<Record<DashboardTab, boolean>>({
        executive: true,
        patient: false,
        billing: false,
    });
    const [revenueFullscreen, setRevenueFullscreen] = useState(false);
    const [patientFlowFullscreen, setPatientFlowFullscreen] = useState(false);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [roleMetricsModalOpen, setRoleMetricsModalOpen] = useState(false);

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        setTabMounted((m) => (m[activeTab] ? m : { ...m, [activeTab]: true }));
    }, [activeTab]);

    /** In-memory cache by range, reset whenever facility changes. */
    const analyticsCacheRef = useRef<Map<string, AnalyticsData>>(new Map());
    useEffect(() => {
        analyticsCacheRef.current = new Map();
    }, [facilityId]);

    const fetchAnalytics = useCallback(async () => {
        const params = new URLSearchParams();
        if (facilityId) params.set('facility_id', facilityId);

        const scope = facilityId || 'session';
        let cacheKey = `${scope}|default`;
        if (dateFrom && dateTo) {
            appendUsageMetricsRange(params, dateFrom, dateTo);
            cacheKey = `${scope}|from=${dateFrom}|to=${dateTo}`;
        }

        const cached = analyticsCacheRef.current.get(cacheKey);
        if (cached) {
            setData(cached);
            setLoading(false);
        } else {
            setLoading(true);
        }

        try {
            const url = `/api/proxy/analytics?${params.toString()}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const json = (await res.json()) as AnalyticsData;
                analyticsCacheRef.current.set(cacheKey, json);
                setData(json);
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, facilityId]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const activeUsers = data?.active_users_count ?? 0;
    const activityRate = data?.active_users_rate_percent ?? 0;
    const totalMessages = data?.total_messages ?? 0;
    const criticalRate = data?.critical_messages_rate_percent ?? 0;
    const escalationRate = data?.escalation_rate_percent ?? 0;
    const escalatedCount = data?.escalated_critical_messages ?? 0;
    const roleFillRate = data?.role_fill_rate_percent ?? 0;
    const filledRoles = data?.filled_roles ?? 0;
    const totalRoles = data?.total_roles ?? 0;

    return (
        <div className="light min-w-0" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6 md:p-8">
                {/* Header Row: Title + Tab switcher + Calendar */}
                <div className="animate-slide-in-up grid grid-cols-1 gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_auto] min-[900px]:items-start min-[900px]:gap-6">
                    <div className="flex min-w-0 flex-1 flex-col gap-3 min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:items-center min-[900px]:gap-x-4 min-[900px]:gap-y-2">
                        <div className="flex min-w-0 shrink-0 flex-col justify-center">
                            <span className="text-[1.5rem] font-bold leading-snug text-text-primary">
                                {TAB_LABELS[activeTab]}
                            </span>
                            <span className="text-xs leading-snug text-gray-400">
                                {dateFrom && dateTo && dateFrom === dateTo
                                    ? `Today — ${new Date(dateFrom + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                    : dateFrom && dateTo
                                        ? `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(dateTo + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                        : (data?.window_days === 0 ? 'Today' : `Last ${data?.window_days ?? 30} days`)}
                            </span>
                        </div>

                        <div className="usage-header-tabs">
                            {(Object.keys(TAB_LABELS) as DashboardTab[]).map((tab) => {
                                const active = tab === activeTab;
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={clsx(
                                            'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                                            active
                                                ? 'bg-accent-primary text-white shadow-sm'
                                                : 'bg-white text-text-secondary hover:bg-tertiary border border-[var(--border-default)]',
                                        )}
                                    >
                                        {TAB_LABELS[tab]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex min-w-0 shrink-0 flex-col items-stretch gap-3 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-end">
                        <CalendarRangePicker
                            from={dateFrom}
                            to={dateTo}
                            onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
                        />
                    </div>
                </div>

                {tabMounted.executive && (
                    <div
                        className={clsx(activeTab !== 'executive' && 'hidden')}
                        aria-hidden={activeTab !== 'executive'}
                    >
                        <div className="grid min-w-0 grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[640px]:gap-5 min-[1280px]:grid-cols-4 min-[1280px]:gap-6 [&>*]:min-w-0">
                            <KpiCard
                                icon={<FaUsers className="w-5 h-5 text-accent-primary" />}
                                iconBgColor="bg-[rgba(36,132,199,0.1)]"
                                label="Active Users"
                                value={loading ? '—' : fmt(activeUsers)}
                                change={{ value: `${activityRate.toFixed(1)}%`, label: 'Activity Rate', trend: activityRate >= 50 ? 'up' : 'down' }}
                                infoText="Number of staff members currently active on the platform out of total registered staff."
                                animationDelay={0}
                            />
                            <KpiCard
                                icon={<FaEnvelope className="w-5 h-5 text-accent-green" />}
                                iconBgColor="bg-[rgba(0,200,179,0.1)]"
                                label="Total Messages"
                                value={loading ? '—' : fmt(totalMessages)}
                                change={{ value: `${criticalRate.toFixed(1)}%`, label: 'Critical Rate', trend: criticalRate > 20 ? 'up' : 'down' }}
                                infoText="Total messages sent across all departments including critical and standard messages."
                                animationDelay={1}
                            />
                            <KpiCard
                                icon={<FaArrowTrendUp className="w-5 h-5 text-accent-red" />}
                                iconBgColor="bg-[rgba(255,95,87,0.1)]"
                                label="Escalation Rate"
                                value={loading ? '—' : `${escalationRate.toFixed(1)}%`}
                                change={{ value: fmt(escalatedCount), label: 'Escalated', trend: escalationRate > 15 ? 'up' : 'down' }}
                                infoText="Percentage of critical messages that triggered escalation notifications out of total messages."
                                animationDelay={2}
                            />
                            <KpiCard
                                icon={<FaShieldHalved className="w-5 h-5 text-accent-violet" />}
                                iconBgColor="bg-[rgba(105,116,247,0.1)]"
                                label="Role Coverage"
                                value={loading ? '—' : `${roleFillRate.toFixed(1)}%`}
                                change={{ value: `${filledRoles}/${totalRoles}`, label: 'Roles Filled', trend: roleFillRate >= 70 ? 'up' : 'down' }}
                                infoText="Percentage of defined roles that are currently filled with assigned staff members."
                                animationDelay={3}
                            />
                        </div>

                        <div className="usage-main-grid" style={{ marginTop: 24 }}>
                            <div className="usage-main-grid__chart animate-slide-in-up stagger-2">
                                <RevenueChart
                                    isFullscreen={revenueFullscreen}
                                    onToggleFullscreen={() => setRevenueFullscreen(!revenueFullscreen)}
                                    dailyVolume={data?.daily_message_volume}
                                />
                            </div>

                            <div className="usage-main-grid__twocol dashboard-two-col">
                                <div className="animate-slide-in-up stagger-3">
                                    <RoleCriticalTraffic roles={data?.role_metrics} />
                                </div>
                                <div className="animate-slide-in-up stagger-4">
                                    <ServiceDistribution departments={data?.department_metrics} />
                                </div>
                            </div>

                            <div className="usage-main-grid__full animate-slide-in-up stagger-5">
                                <DailyPatientFlow
                                    isFullscreen={patientFlowFullscreen}
                                    onToggleFullscreen={() => setPatientFlowFullscreen(!patientFlowFullscreen)}
                                    dailyVolume={data?.daily_message_volume}
                                />
                            </div>

                            <div className="usage-main-grid__sidebar">
                                <div className="animate-slide-in-right stagger-3">
                                    <RedZoneAlerts roles={data?.top_escalated_roles} />
                                </div>
                                <div className="animate-slide-in-right stagger-4">
                                    <LiveUpdates responseTimes={data ? {
                                        avg_critical_ack_minutes: data.avg_critical_ack_minutes,
                                        avg_first_read_minutes_all: data.avg_first_read_minutes_all,
                                        avg_first_read_minutes_critical: data.avg_first_read_minutes_critical,
                                        avg_first_read_minutes_non_critical: data.avg_first_read_minutes_non_critical,
                                        total_calls_made: data.total_calls_made,
                                    } : undefined} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tabMounted.patient && (
                    <div
                        className={clsx(activeTab !== 'patient' && 'hidden')}
                        aria-hidden={activeTab !== 'patient'}
                    >
                        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" /></div>}>
                            <PatientInsightPage data={data} onViewMoreRoles={() => setRoleMetricsModalOpen(true)} />
                        </Suspense>
                    </div>
                )}

                {tabMounted.billing && (
                    <div
                        className={clsx(activeTab !== 'billing' && 'hidden')}
                        aria-hidden={activeTab !== 'billing'}
                    >
                        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" /></div>}>
                            <BillingFinancePage data={data} />
                        </Suspense>
                    </div>
                )}

                <RoleMetricsModal
                    isOpen={roleMetricsModalOpen}
                    onClose={() => setRoleMetricsModalOpen(false)}
                    roles={data?.role_metrics || []}
                />
            </div>
        </div>
    );
}
