'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/TopBar';
import CustomSelect from '@/components/CustomSelect';

/* ── Types ─────────────────────────────────────────────────── */

type Patient = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    medical_record_number: string;
    department_id: string;
    department_name: string;
    age?: number;
    unit: string;
    unit_id: string;
    care_unit_name: string;
    provider_team_id: string;
    care_provider_team_name: string;
    room: string;
    bed: string;
    room_bed_display: string;
    status: string;
    admitted_date: string;
    discharge_date: string;
    dob: string;
    gender: string;
};

type Dept = { id: string; name: string };

/* ── Helpers ───────────────────────────────────────────────── */

const R = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {});
const S = (v: unknown, fb = '') => String(v ?? fb);
const N = (v: unknown) => (typeof v === 'number' ? v : 0);

function extractList(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    const r = R(raw);
    return Array.isArray(r.data) ? r.data : Array.isArray(r.items) ? r.items : [];
}

function parsePatient(row: unknown, idx: number): Patient | null {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const id = S(r.id || r.patient_id, `p-${idx}`);
    if (!id || (id === `p-${idx}` && !r.id)) return null;
    const cu = R(r.care_unit);
    const cpt = R(r.care_provider_team);
    return {
        id,
        first_name: S(r.first_name, 'Unknown'),
        last_name: S(r.last_name, 'Patient'),
        email: S(r.email),
        phone: S(r.phone),
        medical_record_number: S(r.medical_record_number || r.mrn),
        department_id: S(r.department_id),
        department_name: S(r.department_name, 'Unassigned'),
        age: typeof r.age === 'number' ? r.age : undefined,
        unit: S(r.unit),
        unit_id: S(r.unit_id),
        care_unit_name: S(r.care_unit_name || cu.name),
        provider_team_id: S(r.provider_team_id),
        care_provider_team_name: S(r.care_provider_team_name || cpt.name),
        room: S(r.room),
        bed: S(r.bed),
        room_bed_display: S(r.room_bed_display),
        status: S(r.status, 'admitted'),
        admitted_date: S(r.admitted_date),
        discharge_date: S(r.discharge_date),
        dob: S(r.dob),
        gender: S(r.gender),
    };
}

function parsePaged(raw: unknown) {
    const rec = R(raw);
    const items = extractList(raw).map(parsePatient).filter((p): p is Patient => Boolean(p));
    return {
        items,
        total: N(rec.total) || items.length,
        totalPages: N(rec.total_pages) || 1,
    };
}

const statusBadge = (s: string) =>
    s === 'admitted' ? 'badge-critical' : s === 'discharged' ? 'badge-neutral' : 'badge-info';

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12.5 };

/* ── Component ─────────────────────────────────────────────── */

export default function PatientsDirectoryManagement() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [pageId, setPageId] = useState(1);
    const [pageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);

    const [search, setSearch] = useState('');
    const [departmentId, setDepartmentId] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [departments, setDepartments] = useState<Dept[]>([]);

    /* ── Fetch departments ─────────────────────────────────── */

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await fetch('/api/proxy/departments');
            if (!res.ok) return;
            const data = await res.json();
            const list = extractList(data);
            setDepartments(list.map((x: unknown) => {
                const r = R(x);
                return { id: S(r.id), name: S(r.name) };
            }).filter((d: Dept) => d.id && d.name));
        } catch { /* best effort */ }
    }, []);

    /* ── Fetch patients ────────────────────────────────────── */

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('page_size', String(pageSize));
            params.set('page_id', String(pageId));
            if (search.trim()) params.set('search', search.trim());
            if (departmentId !== 'all') params.set('department_id', departmentId);
            if (statusFilter !== 'all') params.set('status', statusFilter);

            const res = await fetch(`/api/proxy/patients?${params.toString()}`);
            if (!res.ok) {
                const text = await res.text();
                setError(text || 'Failed to load patients');
                setPatients([]);
                setTotal(0);
                return;
            }
            const data = await res.json();
            const parsed = parsePaged(data);
            setPatients(parsed.items);
            setTotal(parsed.total);
            setTotalPages(Math.max(1, parsed.totalPages || Math.ceil(parsed.total / pageSize)));
        } catch {
            setError('Failed to load patients');
            setPatients([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [departmentId, pageId, pageSize, search, statusFilter]);

    useEffect(() => { fetchDepartments(); }, [fetchDepartments]);
    useEffect(() => { fetchPatients(); }, [fetchPatients]);

    const computedTotalPages = useMemo(() => Math.max(1, totalPages), [totalPages]);
    const resetFilter = (setter: (v: string) => void) => (v: string) => { setPageId(1); setter(v); };

    /* ── Render ────────────────────────────────────────────── */

    return (
            <div className="app-main">
                <TopBar
                    title="Patients"
                    subtitle="Patient Directory"
                    search={{ placeholder: 'Search by name or MRN...', value: search, onChange: (v) => { setPageId(1); setSearch(v); } }}
                />

                <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'var(--bg-900)' }}>

                    {/* Filters */}
                    <div className="card fade-in" style={{ marginBottom: 14, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                        <CustomSelect value={departmentId} onChange={resetFilter(setDepartmentId)} options={[{ label: 'All Departments', value: 'all' }, ...departments.map(d => ({ label: d.name, value: d.id }))]} placeholder="All Departments" style={{ maxWidth: 240, width: '100%' }} />
                        <CustomSelect value={statusFilter} onChange={resetFilter(setStatusFilter)} options={[{ label: 'All Statuses', value: 'all' }, { label: 'Admitted', value: 'admitted' }, { label: 'Discharged', value: 'discharged' }, { label: 'Outpatient', value: 'outpatient' }]} placeholder="All Statuses" style={{ maxWidth: 180, width: '100%' }} />
                    </div>

                    {/* Table */}
                    <div className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                    <th style={thStyle}>Patient</th>
                                    <th style={thStyle}>MRN</th>
                                    <th style={thStyle}>Department</th>
                                    <th style={thStyle}>Unit</th>
                                    <th style={thStyle}>Room/Bed</th>
                                    <th style={thStyle}>Team</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <span className="material-icons-round" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--text-disabled)' }}>hourglass_empty</span>
                                        Loading patients...
                                    </td></tr>
                                )}
                                {!loading && error && (
                                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--critical)' }}>{error}</td></tr>
                                )}
                                {!loading && !error && patients.length === 0 && (
                                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <span className="material-icons-round" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: 'var(--text-disabled)' }}>person_off</span>
                                        No patients found
                                    </td></tr>
                                )}
                                {!loading && !error && patients.map((p) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--helix-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                                    {p.first_name[0]}{p.last_name[0]}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {p.first_name} {p.last_name}
                                                    </div>
                                                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                                        {p.age !== undefined ? `${p.age}y` : p.dob || ''}{p.gender ? ` · ${p.gender}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5 }}>{p.medical_record_number || '-'}</td>
                                        <td style={tdStyle}>{p.department_name || '-'}</td>
                                        <td style={tdStyle}>{p.care_unit_name || p.unit || '-'}</td>
                                        <td style={tdStyle}>{p.room_bed_display || [p.room, p.bed].filter(Boolean).join('/') || '-'}</td>
                                        <td style={tdStyle}>{p.care_provider_team_name || '-'}</td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 10 }}>{p.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                {total} patient{total !== 1 ? 's' : ''}
                            </span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button className="btn btn-secondary btn-xs" disabled={pageId <= 1} onClick={() => setPageId(p => Math.max(1, p - 1))}>
                                    <span className="material-icons-round" style={{ fontSize: 14 }}>chevron_left</span>
                                </button>
                                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', minWidth: 60, textAlign: 'center' }}>{pageId} / {computedTotalPages}</span>
                                <button className="btn btn-secondary btn-xs" disabled={pageId >= computedTotalPages} onClick={() => setPageId(p => Math.min(computedTotalPages, p + 1))}>
                                    <span className="material-icons-round" style={{ fontSize: 14 }}>chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
    );
}
