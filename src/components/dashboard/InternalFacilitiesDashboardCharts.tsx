'use client';

import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export type ChartFacility = {
    region?: string;
    city?: string;
};

const PIE_COLORS = ['#1e3a5f', '#4a6fa5', '#64748b', '#0d9488', '#94a3b8', '#475569', '#cbd5e1'];

const chartTooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(172, 179, 183, 0.35)',
    borderRadius: 8,
    fontSize: 12,
    color: '#2c3437',
    boxShadow: '0 4px 20px -2px rgba(44, 52, 55, 0.06), 0 12px 40px -8px rgba(44, 52, 55, 0.08)',
};

function buildRegionStats(facilities: ChartFacility[]) {
    const regionMap = new Map<string, number>();
    for (const f of facilities) {
        const r = (f.region && f.region.trim()) || 'Unspecified';
        regionMap.set(r, (regionMap.get(r) || 0) + 1);
    }
    const sorted = [...regionMap.entries()].sort((a, b) => b[1] - a[1]);
    const barData = sorted.map(([name, value]) => ({
        name: name.length > 16 ? `${name.slice(0, 14)}…` : name,
        fullName: name,
        value,
    }));
    const top5 = sorted.slice(0, 5).map(([name, value]) => ({ name, value }));
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    const pieData = rest > 0 ? [...top5, { name: 'Other', value: rest }] : top5;
    return { barData, pieData };
}

export function InternalFacilitiesDashboardCharts({ facilities }: { facilities: ChartFacility[] }) {
    const { barData, pieData } = useMemo(() => buildRegionStats(facilities), [facilities]);

    if (facilities.length === 0) {
        return (
            <div
                style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    background: 'var(--surface-card)',
                    borderRadius: 'var(--radius-lg)',
                }}
            >
                Add facilities to see regional distribution charts.
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(260px, 1fr) minmax(280px, 1.15fr)',
                gap: 20,
                alignItems: 'stretch',
            }}
            className="internal-dashboard-charts-grid"
        >
            <div
                style={{
                    background: 'var(--surface-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '18px 16px 12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(172, 179, 183, 0.22)',
                    minHeight: 300,
                }}
            >
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Regional mix
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.45 }}>
                    Share of facilities by region
                </p>
                <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={58}
                                outerRadius={88}
                                paddingAngle={2}
                            >
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(255,255,255,0.9)" strokeWidth={1} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={chartTooltipStyle}
                                formatter={(value: number, _n, item) => [`${value} facilities`, String(item.payload.name)]}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div
                style={{
                    background: 'var(--surface-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '18px 12px 12px 8px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(172, 179, 183, 0.22)',
                    minHeight: 300,
                }}
            >
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 8 }}>
                    Facilities by region
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.45, paddingLeft: 8 }}>
                    Top regions by active facility count
                </p>
                <div style={{ width: '100%', height: 268 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                            <CartesianGrid stroke="rgba(172, 179, 183, 0.2)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#596064' }} axisLine={false} tickLine={false} interval={0} angle={-28} textAnchor="end" height={56} />
                            <YAxis tick={{ fontSize: 10, fill: '#596064' }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                            <Tooltip
                                contentStyle={chartTooltipStyle}
                                formatter={(value: number) => [`${value}`, 'Facilities']}
                                labelFormatter={(_, payload) => (payload[0]?.payload as { fullName?: string })?.fullName || ''}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#1e3a5f" maxBarSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
