'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import CalendarRangePicker from '@/components/CalendarRangePicker';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export type OsFacility = {
    id: string;
    name: string;
    code?: string;
    city?: string;
    region?: string;
};

export type SubscriptionBreakdown = {
    facility_count: number;
    subscription_type: string;
};

export type TopFacility = {
    facility_id: string;
    facility_name: string;
    member_count: number;
};

export type MetricsData = {
    facilities_created_in_range: number;
    from: string;
    subscription_breakdown: SubscriptionBreakdown[];
    to: string;
    top_facilities_by_members: TopFacility[];
    total_active_members: number;
    total_calls_in_range: number;
    total_critical_messages_in_range: number;
    total_escalations_in_range: number;
    total_facilities: number;
    total_messages_in_range: number;
    window_days: number;
};

export type AuditLogEntry = {
    id?: string;
    user_id?: string;
    user_email?: string;
    action?: string;
    entity_type?: string;
    entity_id?: string;
    details?: string;
    created_at?: string;
    [key: string]: unknown;
};

const TEAL_DIM = '#5eead4';
const TEAL = '#0d9488';
const TEAL_BRIGHT = '#2dd4bf';
const TEAL_DARK = '#0f766e';
const GRAY = '#94a3b8';
const GRAY_LIGHT = '#cbd5e1';
const CORAL = '#f43f5e';
const TEXT = '#0f172a';
const MUTED = '#64748b';

function ServiceDistributionBar({ platinum, professional, standard }: { platinum: number; professional: number; standard: number }) {
    const total = platinum + professional + standard || 1;
    const row = { id: 'mix', platinum, professional, standard };
    return (
        <div>
            <div style={{ height: 52, marginTop: 4 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={[row]} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, total]} hide />
                        <YAxis type="category" dataKey="id" width={0} hide />
                        <Tooltip
                            cursor={false}
                            contentStyle={{
                                background: '#fff',
                                border: '1px solid rgba(15,23,42,0.08)',
                                borderRadius: 8,
                                fontSize: 11,
                                color: TEXT,
                            }}
                            formatter={(v: number, n: string) => [v, n === 'platinum' ? 'Enterprise platinum' : n === 'professional' ? 'Clinical professional' : 'Standard care']}
                        />
                        <Bar dataKey="platinum" stackId="s" fill={TEAL_BRIGHT} radius={[6, 0, 0, 6]} barSize={28} />
                        <Bar dataKey="professional" stackId="s" fill={TEAL} barSize={28} />
                        <Bar dataKey="standard" stackId="s" fill={GRAY} radius={[0, 6, 6, 0]} barSize={28} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 11, color: MUTED }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: TEAL_BRIGHT }} />
                    Enterprise platinum ({platinum})
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: TEAL }} />
                    Clinical professional ({professional})
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: GRAY }} />
                    Standard care ({standard})
                </span>
            </div>
        </div>
    );
}

const cardStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    border: '1px solid rgba(15, 23, 42, 0.06)',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -8px rgba(15, 23, 42, 0.06)',
};

const mono = "'JetBrains Mono', ui-monospace, monospace";

export function FacilityOsLightShell({
    facilities,
    loading,
    error,
    selected,
    onSelect,
    onEnter,
    showAddForm,
    onToggleAddForm,
    addFormPanel,
    directoryTable,
    metrics,
    auditLogs,
    searchQuery,
    onSearchChange,
}: {
    facilities: OsFacility[];
    loading: boolean;
    error: string | null;
    selected: OsFacility | null;
    onSelect: (f: OsFacility) => void;
    onEnter: (f: OsFacility) => void;
    showAddForm: boolean;
    onToggleAddForm: () => void;
    addFormPanel: ReactNode;
    directoryTable: ReactNode;
    metrics?: MetricsData | null;
    auditLogs?: AuditLogEntry[];
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
}) {
    const [utcTime, setUtcTime] = useState('');
    const [activeView, setActiveView] = useState<'dashboard' | 'facilities' | 'audit'>('dashboard');
    const [auditFacilityId, setAuditFacilityId] = useState('');
    const [auditDateFrom, setAuditDateFrom] = useState('');
    const [auditDateTo, setAuditDateTo] = useState('');
    useEffect(() => {
        const tick = () => {
            setUtcTime(new Date().toISOString().slice(11, 19));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // All KPI data from metrics endpoint — show "—" when not loaded
    const totalFacilities = metrics?.total_facilities ?? facilities.length;
    const totalEscalations = metrics?.total_escalations_in_range ?? 0;
    const totalMembers = metrics?.total_active_members ?? 0;
    const newFacilities = metrics?.facilities_created_in_range ?? 0;
    const windowDays = metrics?.window_days ?? 30;
    const totalMessages = metrics?.total_messages_in_range ?? 0;
    const totalCalls = metrics?.total_calls_in_range ?? 0;
    const totalCritical = metrics?.total_critical_messages_in_range ?? 0;
    const metricsFrom = metrics?.from ?? '';
    const metricsTo = metrics?.to ?? '';
    const hasMetrics = !!metrics;

    // Service distribution from subscription_breakdown
    const tiers = useMemo(() => {
        if (metrics?.subscription_breakdown && metrics.subscription_breakdown.length > 0) {
            const breakdown = metrics.subscription_breakdown;
            let platinum = 0, professional = 0, standard = 0;
            for (const b of breakdown) {
                const t = (b.subscription_type || '').toLowerCase();
                if (t.includes('plat') || t.includes('enterprise')) platinum += b.facility_count;
                else if (t.includes('prof') || t.includes('clinical')) professional += b.facility_count;
                else standard += b.facility_count;
            }
            return { platinum, professional, standard, total: platinum + professional + standard };
        }
        return { platinum: 0, professional: 0, standard: totalFacilities, total: totalFacilities };
    }, [metrics, totalFacilities]);

    // Performance rank from top_facilities_by_members
    const ranked = useMemo(() => {
        if (metrics?.top_facilities_by_members && metrics.top_facilities_by_members.length > 0) {
            return metrics.top_facilities_by_members.slice(0, 4);
        }
        return [];
    }, [metrics]);

    const railBtn = (icon: string, active?: boolean, onClick?: () => void) => (
        <button
            type="button"
            onClick={onClick}
            style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: onClick ? 'pointer' : 'default',
                background: active ? 'rgba(13, 148, 136, 0.14)' : 'transparent',
                color: active ? TEAL_DARK : MUTED,
                transition: 'background 0.15s, color 0.15s',
            }}
        >
            <span className="material-icons-round" style={{ fontSize: 22 }}>{icon}</span>
        </button>
    );

    return (
        <div className="facility-os-light helix-page-texture" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: TEXT }}>
            {/* Top bar */}
            <header
                style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '12px 20px 12px 16px',
                    background: 'rgba(255,255,255,0.78)',
                    borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="/helix-logo.png" alt="Helix" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.04em', color: TEXT }}>HELIX SUPER ADMIN</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                        value={searchQuery ?? ''}
                        onChange={e => onSearchChange?.(e.target.value)}
                        placeholder="Search facilities…"
                        style={{
                            width: 220,
                            maxWidth: '28vw',
                            padding: '8px 12px',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            borderRadius: 8,
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            background: 'rgba(241, 245, 249, 0.9)',
                            color: TEXT,
                            outline: 'none',
                        }}
                    />
                    {['notifications', 'account_circle'].map(icon => (
                        <span key={icon} className="material-icons-round" style={{ fontSize: 22, color: MUTED, cursor: 'pointer' }}>{icon}</span>
                    ))}
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {/* Icon rail */}
                <aside
                    style={{
                        width: 56,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '12px 0',
                        gap: 6,
                        background: 'rgba(255,255,255,0.55)',
                        borderRight: '1px solid rgba(15, 23, 42, 0.06)',
                        overflow: 'hidden',
                    }}
                >
                    {railBtn('dashboard', activeView === 'dashboard', () => setActiveView('dashboard'))}
                    {railBtn('domain', activeView === 'facilities', () => setActiveView('facilities'))}
                    {railBtn('hub', activeView === 'audit', () => setActiveView('audit'))}
                    {railBtn('build', false)}
                    {railBtn('bar_chart', false)}
                    {railBtn('settings', false)}
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        onClick={onToggleAddForm}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            border: 'none',
                            background: `linear-gradient(145deg, ${TEAL_DIM} 0%, ${TEAL} 45%, ${TEAL_DARK} 100%)`,
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
                        }}
                        title={showAddForm ? 'Close' : 'Add facility'}
                    >
                        <span className="material-icons-round" style={{ fontSize: 22 }}>{showAddForm ? 'close' : 'add'}</span>
                    </button>
                </aside>

                {/* Main scroll */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '16px 20px 72px' }}>
                    {activeView === 'facilities' ? (
                        <div style={{ margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>Facilities</h2>
                                    <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0', fontWeight: 500 }}>{facilities.length} registered facilities</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onToggleAddForm}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '10px 18px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        border: 'none',
                                        borderRadius: 8,
                                        background: TEAL,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
                                    }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: 18 }}>{showAddForm ? 'close' : 'add'}</span>
                                    {showAddForm ? 'Cancel' : 'Add Facility'}
                                </button>
                            </div>
                            <div style={{ ...cardStyle, overflow: 'hidden' }}>
                                {addFormPanel}
                                <div style={{ padding: '12px 16px', background: 'rgba(241,245,249,0.65)', borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: MUTED }}>FACILITY DIRECTORY</div>
                                            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Click a row to select · Enter opens admin shell</div>
                                        </div>
                                        <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>
                                            Use the search bar above to filter
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '12px 14px 16px' }}>{directoryTable}</div>
                            </div>
                            {selected && (
                                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-primary btn-sm" style={{ justifyContent: 'center', background: TEAL, border: 'none', padding: '10px 20px', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => onEnter(selected)}>
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>open_in_new</span>
                                        Open {selected.name}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeView === 'audit' ? (
                        <div style={{ margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>Audit Logs</h2>
                                    <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0', fontWeight: 500 }}>
                                        {auditLogs?.length || 0} entries
                                    </p>
                                </div>
                            </div>
                            <div style={{ ...cardStyle, overflow: 'hidden' }}>
                                <div style={{ padding: '12px 16px', background: 'rgba(241,245,249,0.65)', borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: MUTED }}>AUDIT TRAIL</div>
                                            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>System activity and changes</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <select
                                                style={{
                                                    padding: '5px 8px',
                                                    fontSize: 11,
                                                    border: '1px solid rgba(15,23,42,0.12)',
                                                    borderRadius: 6,
                                                    background: '#fff',
                                                    color: '#0f172a',
                                                }}
                                                value={auditFacilityId}
                                                onChange={e => setAuditFacilityId(e.target.value)}
                                            >
                                                <option value="">All Facilities</option>
                                                {facilities.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                            <CalendarRangePicker
                                                from={auditDateFrom}
                                                to={auditDateTo}
                                                onChange={(from, to) => { setAuditDateFrom(from); setAuditDateTo(to); }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '12px 14px 16px' }}>
                                    {!auditLogs || auditLogs.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontSize: 13 }}>
                                            No audit log entries.
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED, background: 'rgba(241,245,249,0.65)', borderRadius: '6px 0 0 6px' }}>Timestamp</th>
                                                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED, background: 'rgba(241,245,249,0.65)' }}>User</th>
                                                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED, background: 'rgba(241,245,249,0.65)' }}>Action</th>
                                                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED, background: 'rgba(241,245,249,0.65)' }}>Entity</th>
                                                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED, background: 'rgba(241,245,249,0.65)', borderRadius: '0 6px 6px 0' }}>Details</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {auditLogs
                                                        .filter(entry => {
                                                            // Facility filter
                                                            if (auditFacilityId && entry.entity_id !== auditFacilityId) return false;
                                                            
                                                            // Date range filter
                                                            if (auditDateFrom || auditDateTo) {
                                                                if (!entry.created_at) return false;
                                                                const entryDate = new Date(entry.created_at);
                                                                const fromDate = auditDateFrom ? new Date(auditDateFrom + 'T00:00:00') : null;
                                                                const toDate = auditDateTo ? new Date(auditDateTo + 'T23:59:59') : null;
                                                                if (fromDate && entryDate < fromDate) return false;
                                                                if (toDate && entryDate > toDate) return false;
                                                            }
                                                            
                                                            return true;
                                                        })
                                                        .map((entry, i) => {
                                                            const ts = entry.created_at ? new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                                                            const isDelete = entry.action === 'delete';
                                                            return (
                                                                <tr key={entry.id || i} style={{ background: i % 2 === 0 ? 'rgba(248, 250, 252, 0.65)' : 'rgba(255, 255, 255, 0.9)' }}>
                                                                    <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{ts}</td>
                                                                    <td style={{ padding: '8px 10px', color: '#0f172a', fontSize: 11 }}>{entry.user_email || '—'}</td>
                                                                    <td style={{ padding: '8px 10px', color: isDelete ? CORAL : TEAL_DARK, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{entry.action || 'unknown'}</td>
                                                                    <td style={{ padding: '8px 10px', color: '#475569', fontSize: 11 }}>{entry.entity_type || '—'}</td>
                                                                    <td style={{ padding: '8px 10px', color: '#475569', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.details || ''}>{entry.details || '—'}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                    <div>
                        {/* KPI row */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                gap: 14,
                                marginBottom: 16,
                            }}
                            className="facility-os-kpi-row"
                        >
                            {/* Total Messages */}
                            <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13,148,136,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: TEAL_DARK }}>TM</span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Total Messages</div>
                                            <div style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>System Volume</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.1 }}>
                                    {(loading || !hasMetrics) ? '—' : totalMessages.toLocaleString()}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 10, color: MUTED, fontWeight: 600 }}>
                                    <span>Last {windowDays} Days</span>
                                    <span>{metricsTo ? new Date(metricsTo).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</span>
                                </div>
                            </div>

                            {/* Total Calls */}
                            <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(217,119,6,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: '#b45309' }}>TC</span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Total Calls Made</div>
                                            <div style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>Cumulative</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.1 }}>
                                    {(loading || !hasMetrics) ? '—' : totalCalls.toLocaleString()}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 10, color: MUTED, fontWeight: 600 }}>
                                    <span>Last {windowDays} Days</span>
                                    <span>{totalFacilities} Facilities</span>
                                </div>
                            </div>

                            {/* Active Members */}
                            <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>AM</span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Active Members</div>
                                            <div style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>All Facilities</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.1 }}>
                                    {(loading || !hasMetrics) ? '—' : totalMembers.toLocaleString()}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 10, color: MUTED, fontWeight: 600 }}>
                                    <span>{totalFacilities} Facilities</span>
                                    <span>{newFacilities > 0 ? `+${newFacilities} new` : ''}</span>
                                </div>
                            </div>

                            {/* Escalations */}
                            <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: CORAL }}>ES</span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Escalations</div>
                                            <div style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>In Range</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.1 }}>
                                    {(loading || !hasMetrics) ? '—' : totalEscalations.toLocaleString()}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 10, color: MUTED, fontWeight: 600 }}>
                                    <span>Last {windowDays} Days</span>
                                    <span style={{ color: totalCritical > 0 ? CORAL : TEAL, fontWeight: 700 }}>{totalCritical} critical</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, alignItems: 'start' }} className="facility-os-main-grid">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                                <div style={{ ...cardStyle, padding: '16px 18px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: MUTED }}>SERVICE DISTRIBUTION</div>
                                    {!hasMetrics && facilities.length === 0 && !loading ? (
                                        <p style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>No facilities — add one to populate tiers.</p>
                                    ) : (
                                        <ServiceDistributionBar platinum={tiers.platinum} professional={tiers.professional} standard={tiers.standard} />
                                    )}
                                </div>

                                <div style={{ ...cardStyle, overflow: 'hidden' }}>
                                    {addFormPanel}
                                    <div style={{ padding: '12px 16px', background: 'rgba(241,245,249,0.65)', borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: MUTED }}>FACILITY DIRECTORY</div>
                                        <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Select a row · Enter opens admin shell</div>
                                    </div>
                                    <div style={{ padding: '12px 14px 16px' }}>{directoryTable}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="facility-os-right-col">
                                <div style={{ ...cardStyle, padding: '16px 18px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: MUTED, marginBottom: 14 }}>AGGREGATE METRICS</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(13,148,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <span className="material-icons-round" style={{ fontSize: 20, color: TEAL }}>chat</span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total messages</div>
                                                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{(loading || !hasMetrics) ? '—' : totalMessages.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(13,148,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <span className="material-icons-round" style={{ fontSize: 20, color: TEAL }}>phone_in_talk</span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total voice calls</div>
                                                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{(loading || !hasMetrics) ? '—' : totalCalls.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(244,63,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <span className="material-icons-round" style={{ fontSize: 20, color: CORAL }}>warning</span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Critical alerts</div>
                                                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, color: CORAL }}>{(loading || !hasMetrics) ? '—' : totalCritical.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ ...cardStyle, padding: '16px 18px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: MUTED, marginBottom: 14 }}>PERFORMANCE RANK</div>
                                    {ranked.length === 0 ? (
                                        <p style={{ fontSize: 12, color: MUTED }}>No facilities ranked yet.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            {ranked.map((tf, i) => {
                                                const maxMembers = ranked[0]?.member_count || 1;
                                                const w = Math.max(20, Math.round((tf.member_count / maxMembers) * 100));
                                                return (
                                                    <div
                                                        key={tf.facility_id}
                                                        style={{
                                                            textAlign: 'left',
                                                            border: '1px solid rgba(15,23,42,0.06)',
                                                            borderRadius: 10,
                                                            padding: '10px 12px',
                                                            background: 'rgba(248,250,252,0.9)',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                            <span style={{ fontSize: 11, fontWeight: 800, color: GRAY }}>{String(i + 1).padStart(2, '0')}</span>
                                                            <span style={{ fontSize: 11, fontWeight: 700, color: TEAL }}>{tf.member_count.toLocaleString()} members</span>
                                                        </div>
                                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{tf.facility_name}</div>
                                                        <div style={{ height: 6, borderRadius: 99, background: GRAY_LIGHT, marginTop: 8 }}>
                                                            <div style={{ width: `${w}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${TEAL} 0%, ${TEAL_BRIGHT} 100%)` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {selected && (
                                        <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 14, justifyContent: 'center', background: TEAL, border: 'none' }} onClick={() => onEnter(selected)}>
                                            <span className="material-icons-round" style={{ fontSize: 16, marginRight: 4 }}>open_in_new</span>
                                            Open facility
                                        </button>
                                    )}
                                </div>

                                <div style={{ ...cardStyle, padding: '14px 14px 12px', flex: 1, minHeight: 200 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: MUTED, marginBottom: 10 }}>AUDIT LOG</div>
                                    <div
                                        style={{
                                            fontFamily: mono,
                                            fontSize: 10,
                                            lineHeight: 1.65,
                                            color: TEXT,
                                            background: 'rgba(241,245,249,0.85)',
                                            borderRadius: 8,
                                            padding: '10px 12px',
                                            border: '1px solid rgba(15,23,42,0.06)',
                                            maxHeight: 220,
                                            overflowY: 'auto',
                                        }}
                                    >
                                        {!auditLogs || auditLogs.length === 0 ? (
                                            <div style={{ color: MUTED }}>No audit log entries.</div>
                                        ) : (
                                            auditLogs.map((entry, i) => {
                                                const ts = entry.created_at ? new Date(entry.created_at).toLocaleTimeString('en-US', { hour12: false }) : '';
                                                const isDelete = entry.action === 'delete';
                                                return (
                                                    <div key={entry.id || i} style={{ color: isDelete ? CORAL : TEAL_DARK }}>
                                                        [{ts}] {(entry.action || 'unknown').toUpperCase()} {entry.entity_type || ''} {entry.user_email ? `— ${entry.user_email}` : ''}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            </div>

            <footer
                style={{
                    flexShrink: 0,
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 20px 8px 72px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: MUTED,
                    background: 'rgba(255,255,255,0.9)',
                    borderTop: '1px solid rgba(15, 23, 42, 0.06)',
                    backdropFilter: 'blur(10px)',
                    fontFamily: mono,
                }}
            >
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span>{totalFacilities} FACILITIES</span>
                    <span>{totalMembers.toLocaleString()} MEMBERS</span>
                    <span>{metricsFrom && metricsTo ? `${metricsFrom.slice(0, 10)} → ${metricsTo.slice(0, 10)}` : `LAST ${windowDays}D`}</span>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span>{utcTime || '—'} UTC</span>
                </div>
            </footer>

            <style jsx global>{`
                @media (max-width: 1180px) {
                    .facility-os-main-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .facility-os-right-col {
                        flex-direction: row !important;
                        flex-wrap: wrap;
                    }
                    .facility-os-right-col > div {
                        flex: 1 1 280px;
                    }
                }
                @media (max-width: 900px) {
                    .facility-os-kpi-row {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                }
                @media (max-width: 520px) {
                    .facility-os-kpi-row {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
