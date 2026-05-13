'use client';

import { useEffect, useState } from 'react';
import { API_ENDPOINTS, getHelixAdminFacilityEntryUrl } from '@/lib/config';
import { FacilityOsLightShell, type MetricsData, type AuditLogEntry } from '@/components/dashboard/FacilityOsLightShell';

type Facility = {
    id: string;
    name: string;
    code?: string;
    city?: string;
    region?: string;
};

export default function InternalDashboardPage() {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Facility | null>(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        name: '',
        code: '',
        city: '',
        region: '',
        address: '',
        admin_email: '',
        email: '',
        contact_phone: '',
        primary_contact_first_name: '',
        primary_contact_last_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',
        subscription_type: '1yr',
    });
    const [toast, setToast] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchFacilities = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(API_ENDPOINTS.FACILITIES, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data?.message || 'Failed to load facilities');
                }
                const list = Array.isArray(data) ? data : (data.facilities || data.data || []);
                setFacilities(list);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to load facilities';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        const fetchMetrics = async () => {
            try {
                const res = await fetch(API_ENDPOINTS.INTERNAL_FACILITIES_METRICS, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setMetrics(data);
                }
            } catch {
                // metrics are best-effort; dashboard still works without them
            }
        };

        const fetchAuditLogs = async () => {
            try {
                const res = await fetch(`${API_ENDPOINTS.INTERNAL_AUDIT_LOGS}?page_size=20`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    const items = Array.isArray(data) ? data : (data.items || data.logs || data.data || []);
                    setAuditLogs(items);
                }
            } catch {
                // audit logs are best-effort
            }
        };

        fetchFacilities();
        fetchMetrics();
        fetchAuditLogs();
    }, []);

    const resetForm = () => {
        setForm({
            name: '',
            code: '',
            city: '',
            region: '',
            address: '',
            admin_email: '',
            email: '',
            contact_phone: '',
            primary_contact_first_name: '',
            primary_contact_last_name: '',
            primary_contact_email: '',
            primary_contact_phone: '',
            subscription_type: '1yr',
        });
    };

    const handleCreateFacility = async () => {
        if (!form.name.trim()) {
            setToast('Facility name is required.');
            return;
        }
        setCreating(true);
        try {
            const payload = {
                name: form.name,
                address: form.address || undefined,
                admin_email: form.admin_email || undefined,
                city: form.city || undefined,
                contact_phone: form.contact_phone || undefined,
                email: form.email || undefined,
                primary_contact_email: form.primary_contact_email || undefined,
                primary_contact_first_name: form.primary_contact_first_name || undefined,
                primary_contact_last_name: form.primary_contact_last_name || undefined,
                primary_contact_phone: form.primary_contact_phone || undefined,
                region: form.region || undefined,
                subscription_type: form.subscription_type || undefined,
            };
            const res = await fetch(API_ENDPOINTS.FACILITIES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = (data && (data.message || data.detail || data.error)) || 'Failed to create facility';
                setToast(String(msg));
                return;
            }
            const created: Facility = {
                id: data.id,
                name: data.name || form.name,
                code: data.code || form.code,
                city: data.city || form.city,
                region: data.region || form.region,
            };
            setFacilities(prev => [...prev, created]);
            setSelected(created);
            resetForm();
            setShowAddForm(false);
            setToast('Facility created.');
        } catch {
            setToast('Failed to create facility.');
        } finally {
            setCreating(false);
        }
    };

    const handleOpenFacility = (facility: Facility) => {
        if (typeof window !== 'undefined') {
            window.location.assign(getHelixAdminFacilityEntryUrl(facility.id));
        }
    };

    const fieldStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 500,
        borderRadius: 8,
        border: '1px solid rgba(15, 23, 42, 0.12)',
        background: '#fff',
        color: '#0f172a',
        outline: 'none',
        transition: 'border-color 0.15s',
    };
    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color: '#64748b',
        marginBottom: 6,
        letterSpacing: '0.02em',
    };
    const sectionTitle = (text: string) => (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>{text}</div>
    );

    const addFormPanel = showAddForm ? (
        <div style={{ padding: '24px 28px', background: 'rgba(248,250,252,0.9)', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>New Facility</h2>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Fill in the details below. Code is generated automatically.</p>
                </div>
            </div>

            {sectionTitle('Facility Details')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 20 }}>
                <div>
                    <label style={labelStyle}>Facility Name *</label>
                    <input style={fieldStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Accra Medical Centre" />
                </div>
                <div>
                    <label style={labelStyle}>Region</label>
                    <input style={fieldStyle} value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. Greater Accra" />
                </div>
                <div>
                    <label style={labelStyle}>City</label>
                    <input style={fieldStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Accra" />
                </div>
                <div>
                    <label style={labelStyle}>Address</label>
                    <input style={fieldStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
                </div>
            </div>

            {sectionTitle('Facility Contact')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 20 }}>
                <div>
                    <label style={labelStyle}>Facility Contact</label>
                    <input style={fieldStyle} type="email" value={form.admin_email} onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))} placeholder="admin@facility.com" />
                </div>
                <div>
                    <label style={labelStyle}>Facility Email</label>
                    <input style={fieldStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@facility.com" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Contact Phone</label>
                    <input style={fieldStyle} value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+233 XX XXX XXXX" />
                </div>
            </div>

            {sectionTitle('Primary Contact')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 24 }}>
                <div>
                    <label style={labelStyle}>First Name</label>
                    <input style={fieldStyle} value={form.primary_contact_first_name} onChange={e => setForm(f => ({ ...f, primary_contact_first_name: e.target.value }))} placeholder="First name" />
                </div>
                <div>
                    <label style={labelStyle}>Last Name</label>
                    <input style={fieldStyle} value={form.primary_contact_last_name} onChange={e => setForm(f => ({ ...f, primary_contact_last_name: e.target.value }))} placeholder="Last name" />
                </div>
                <div>
                    <label style={labelStyle}>Email</label>
                    <input style={fieldStyle} type="email" value={form.primary_contact_email} onChange={e => setForm(f => ({ ...f, primary_contact_email: e.target.value }))} placeholder="contact@email.com" />
                </div>
                <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={fieldStyle} value={form.primary_contact_phone} onChange={e => setForm(f => ({ ...f, primary_contact_phone: e.target.value }))} placeholder="+233 XX XXX XXXX" />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                    type="button"
                    onClick={() => { resetForm(); setShowAddForm(false); }}
                    style={{ padding: '10px 20px', fontSize: 12, fontWeight: 700, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleCreateFacility}
                    disabled={creating}
                    style={{ padding: '10px 24px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 8, background: '#0d9488', color: '#fff', cursor: creating ? 'wait' : 'pointer', opacity: creating ? 0.7 : 1 }}
                >
                    {creating ? 'Creating…' : 'Create Facility'}
                </button>
            </div>
        </div>
    ) : null;

    const directoryTable = loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading facilities…</div>
    ) : error ? (
        <div style={{ padding: '16px 14px', borderRadius: 8, background: '#faf2f3', border: '1px solid rgba(140, 90, 94, 0.2)', fontSize: 13, color: '#9e3a42', fontWeight: 500 }}>
            {error}
        </div>
    ) : facilities.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No facilities found.</div>
    ) : (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th style={{ width: '35%', textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', background: '#f8fafc', borderRadius: '8px 0 0 8px' }}>Name</th>
                        <th style={{ width: '12%', textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', background: '#f8fafc' }}>Code</th>
                        <th style={{ width: '20%', textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', background: '#f8fafc' }}>City</th>
                        <th style={{ width: '20%', textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', background: '#f8fafc' }}>Region</th>
                        <th style={{ width: '13%', textAlign: 'right', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', background: '#f8fafc', borderRadius: '0 8px 8px 0' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {facilities.filter(f => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (f.name || '').toLowerCase().includes(q)
                            || (f.code || '').toLowerCase().includes(q)
                            || (f.city || '').toLowerCase().includes(q)
                            || (f.region || '').toLowerCase().includes(q);
                    }).map((f, i) => {
                        const active = selected?.id === f.id;
                        const stripe = i % 2 === 0 ? 'rgba(248, 250, 252, 0.65)' : 'rgba(255, 255, 255, 0.9)';
                        return (
                            <tr
                                key={f.id}
                                style={{
                                    cursor: 'pointer',
                                    transition: 'background 0.12s',
                                    background: active ? 'rgba(13, 148, 136, 0.07)' : stripe,
                                }}
                                onClick={() => setSelected(f)}
                                onMouseEnter={e => {
                                    if (!active) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(13, 148, 136, 0.04)';
                                }}
                                onMouseLeave={e => {
                                    if (!active) (e.currentTarget as HTMLTableRowElement).style.background = stripe;
                                }}
                            >
                                <td style={{ padding: '12px 12px', color: '#0f172a', fontWeight: 600, borderRadius: '8px 0 0 8px' }}>{f.name}</td>
                                <td style={{ padding: '12px 12px', color: '#475569' }}>
                                    {f.code ? (
                                        <span className="badge badge-info" style={{ fontSize: 10, padding: '4px 10px' }}>{f.code}</span>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td style={{ padding: '12px 12px', color: '#475569' }}>{f.city || '—'}</td>
                                <td style={{ padding: '12px 12px', color: '#475569' }}>{f.region || '—'}</td>
                                <td style={{ padding: '12px 12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-xs"
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleOpenFacility(f);
                                        }}
                                    >
                                        Enter
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <>
            {toast && (
                <div className="toast-enter" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#fff', borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a', boxShadow: '0 4px 20px -2px rgba(15,23,42,0.08), 0 12px 40px -8px rgba(15,23,42,0.1)' }}>
                    {toast}
                </div>
            )}
            <FacilityOsLightShell
                facilities={facilities}
                loading={loading}
                error={error}
                selected={selected}
                onSelect={setSelected}
                onEnter={handleOpenFacility}
                showAddForm={showAddForm}
                onToggleAddForm={() => {
                    setShowAddForm(v => !v);
                    if (!showAddForm) resetForm();
                }}
                addFormPanel={addFormPanel}
                directoryTable={directoryTable}
                metrics={metrics}
                auditLogs={auditLogs}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />
        </>
    );
}
