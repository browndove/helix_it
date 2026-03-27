'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import navSections from '@/components/navSections';
import CustomSelect from '@/components/CustomSelect';

/* ── Types ─────────────────────────────────────────────────── */

type Patient = {
    id: string; first_name: string; last_name: string; email: string; phone: string;
    medical_record_number: string; department_id: string; department_name: string;
    age?: number; unit: string; unit_id: string; care_unit_name: string;
    provider_team_id: string; care_provider_team_name: string;
    room: string; bed: string; room_bed_display: string; status: string;
    admitted_date: string; discharge_date: string; dob: string; gender: string;
    care_unit?: Record<string, unknown>; care_provider_team?: Record<string, unknown>;
};

type Folder = { id: string; name: string; description?: string; patients: FolderPatient[]; patient_count: number };
type FolderPatient = { id: string; first_name: string; last_name: string; medical_record_number: string; status: string; room: string; bed: string; care_unit_name: string };
type UnitLookup = { id: string; name: string };

type CareSummary = {
    total_patients: number; patients_with_unit: number; patients_without_unit: number;
    patients_with_provider_team: number; patients_without_provider_team: number;
    by_unit: { unit_id: string; unit_name: string; patient_count: number }[];
    by_provider_team: { provider_team_id: string; team_name: string; patient_count: number }[];
};

type SelectedItem = { kind: 'unit'; id: string; name: string } | { kind: 'folder'; id: string; name: string };

/* ── Helpers ───────────────────────────────────────────────── */

const R = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {});
const S = (v: unknown, fb = '') => String(v ?? fb);
const N = (v: unknown) => (typeof v === 'number' ? v : 0);

function extractList(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    const r = R(raw);
    return Array.isArray(r.items) ? r.items : Array.isArray(r.data) ? r.data : Array.isArray(r.folders) ? r.folders : Array.isArray(r.patient_folders) ? r.patient_folders : [];
}

function parsePatient(row: unknown, idx: number): Patient | null {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const id = S(r.id || r.patient_id, `p-${idx}`);
    if (!id || (id === `p-${idx}` && !r.id)) return null;
    const cu = R(r.care_unit); const cpt = R(r.care_provider_team);
    return {
        id, first_name: S(r.first_name, 'Unknown'), last_name: S(r.last_name, 'Patient'), email: S(r.email), phone: S(r.phone),
        medical_record_number: S(r.medical_record_number || r.mrn), department_id: S(r.department_id), department_name: S(r.department_name, 'Unassigned'),
        age: typeof r.age === 'number' ? r.age : undefined, unit: S(r.unit), unit_id: S(r.unit_id),
        care_unit_name: S(r.care_unit_name || cu.name), provider_team_id: S(r.provider_team_id),
        care_provider_team_name: S(r.care_provider_team_name || cpt.name), room: S(r.room), bed: S(r.bed),
        room_bed_display: S(r.room_bed_display), status: S(r.status, 'admitted'), admitted_date: S(r.admitted_date),
        discharge_date: S(r.discharge_date), dob: S(r.dob), gender: S(r.gender),
        care_unit: cu.id ? cu : undefined, care_provider_team: cpt.id ? cpt : undefined,
    };
}

function parsePaged(raw: unknown) {
    const rec = R(raw);
    const items = extractList(raw).map(parsePatient).filter((p): p is Patient => Boolean(p));
    return { items, total: N(rec.total) || items.length, totalPages: N(rec.total_pages) || 1 };
}

function parseFolder(x: unknown): Folder | null {
    const r = R(x); const id = S(r.id).trim(); if (!id) return null;
    const pats = Array.isArray(r.patients) ? r.patients.map((p: unknown) => {
        const pr = R(p);
        return { id: S(pr.id || pr.patient_id), first_name: S(pr.first_name), last_name: S(pr.last_name), medical_record_number: S(pr.medical_record_number || pr.mrn), status: S(pr.status, 'admitted'), room: S(pr.room), bed: S(pr.bed), care_unit_name: S(pr.care_unit_name) } as FolderPatient;
    }).filter(p => p.id) : [];
    return { id, name: S(r.name, 'Untitled Folder').trim(), description: S(r.description).trim(), patients: pats, patient_count: N(r.patient_count) || pats.length };
}

function parseFolders(raw: unknown): Folder[] { return extractList(raw).map(parseFolder).filter((f): f is Folder => Boolean(f)); }

function parseCareSummary(raw: unknown): CareSummary | null {
    const r = R(raw);
    if (!r.total_patients && r.total_patients !== 0) return null;
    return {
        total_patients: N(r.total_patients), patients_with_unit: N(r.patients_with_unit), patients_without_unit: N(r.patients_without_unit),
        patients_with_provider_team: N(r.patients_with_provider_team), patients_without_provider_team: N(r.patients_without_provider_team),
        by_unit: Array.isArray(r.by_unit) ? r.by_unit.map((u: unknown) => { const ur = R(u); return { unit_id: S(ur.unit_id), unit_name: S(ur.unit_name), patient_count: N(ur.patient_count) }; }) : [],
        by_provider_team: Array.isArray(r.by_provider_team) ? r.by_provider_team.map((t: unknown) => { const tr = R(t); return { provider_team_id: S(tr.provider_team_id), team_name: S(tr.team_name), patient_count: N(tr.patient_count) }; }) : [],
    };
}

const statusBadge = (s: string) => s === 'admitted' ? 'badge-critical' : s === 'discharged' ? 'badge-neutral' : 'badge-info';
const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 12.5 };

/* ── Component ─────────────────────────────────────────────── */

export default function PatientListFolders() {
    const [toast, setToast] = useState<string | null>(null);
    const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400); }, []);

    const [units, setUnits] = useState<UnitLookup[]>([]);
    const [summary, setSummary] = useState<CareSummary | null>(null);

    const [folders, setFolders] = useState<Folder[]>([]);
    const [foldersLoading, setFoldersLoading] = useState(true);
    const [selected, setSelected] = useState<SelectedItem | null>(null);
    const [folderPatients, setFolderPatients] = useState<FolderPatient[]>([]);
    const [fpLoading, setFpLoading] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [saving, setSaving] = useState(false);

    const [showAddPanel, setShowAddPanel] = useState(false);
    const [addMode, setAddMode] = useState<'unit' | 'search'>('unit');
    const [addUnitId, setAddUnitId] = useState('');
    const [addPatients, setAddPatients] = useState<Patient[]>([]);
    const [addLoading, setAddLoading] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [addSearchResults, setAddSearchResults] = useState<Patient[]>([]);
    const [addSearchLoading, setAddSearchLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const selectedFolder = useMemo(() => selected?.kind === 'folder' ? folders.find(f => f.id === selected.id) || null : null, [folders, selected]);

    /* ── Fetchers ──────────────────────────────────────────── */

    const fetchLookups = useCallback(async () => {
        try {
            const [uRes, csRes] = await Promise.all([fetch('/api/proxy/units'), fetch('/api/proxy/patients/care-summary')]);
            if (uRes.ok) { const u = await uRes.json(); setUnits(extractList(u).map((x: unknown) => { const r = R(x); return { id: S(r.id), name: S(r.name) }; }).filter((u: UnitLookup) => u.id && u.name)); }
            if (csRes.ok) { const cs = await csRes.json(); setSummary(parseCareSummary(cs)); }
        } catch { /* best effort */ }
    }, []);

    const fetchFolders = useCallback(async () => {
        setFoldersLoading(true);
        try {
            const res = await fetch('/api/proxy/patient-folders');
            if (res.ok) { const parsed = parseFolders(await res.json()); setFolders(parsed); }
        } catch { /* silent */ }
        setFoldersLoading(false);
    }, []);

    const fetchFolderPatients = useCallback(async (folderId: string) => {
        setFpLoading(true);
        try {
            const res = await fetch(`/api/proxy/patient-folders/${folderId}`);
            if (res.ok) {
                const folder = parseFolder(await res.json());
                if (folder) {
                    setFolderPatients(folder.patients);
                    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, patients: folder.patients, patient_count: folder.patient_count || folder.patients.length } : f));
                }
            }
        } catch { /* silent */ }
        setFpLoading(false);
    }, []);

    const fetchUnitPatients = useCallback(async (uid: string) => {
        if (!uid) return;
        setFpLoading(true);
        try {
            // Backend directory endpoint does not reliably accept unit_id filtering in all deployments.
            // Fetch a large slice of the facility directory and filter client-side by care_unit/unit_id.
            const params = new URLSearchParams({ page_size: '200', page_id: '1', directory_scope: 'all' });
            const res = await fetch(`/api/proxy/patients/directory?${params.toString()}`);
            if (res.ok) {
                const parsed = parsePaged(await res.json());
                const filtered = parsed.items.filter(p => p.unit_id === uid || p.care_unit?.id === uid);
                setFolderPatients(filtered.map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name, medical_record_number: p.medical_record_number, status: p.status, room: p.room, bed: p.bed, care_unit_name: p.care_unit_name })));
            } else {
                setFolderPatients([]);
            }
        } catch {
            setFolderPatients([]);
        }
        setFpLoading(false);
    }, []);

    const fetchAddUnitPatients = useCallback(async (uid: string) => {
        if (!uid) { setAddPatients([]); return; }
        setAddLoading(true);
        try {
            const params = new URLSearchParams({ page_size: '200', page_id: '1', directory_scope: 'all' });
            const res = await fetch(`/api/proxy/patients/directory?${params.toString()}`);
            if (res.ok) {
                const parsed = parsePaged(await res.json());
                setAddPatients(parsed.items.filter(p => p.unit_id === uid || p.care_unit?.id === uid));
            } else {
                setAddPatients([]);
            }
        } catch {
            setAddPatients([]);
        }
        setAddLoading(false);
    }, []);

    const searchAddPatients = useCallback(async () => {
        const query = addSearch.trim();
        if (!query) { setAddSearchResults([]); return; }
        setAddSearchLoading(true);
        try {
            const params = new URLSearchParams({ q: query, page_size: '50', page_id: '1' });
            const res = await fetch(`/api/proxy/patients/search?${params.toString()}`);
            if (res.ok) {
                const parsed = parsePaged(await res.json());
                setAddSearchResults(parsed.items);
            } else {
                setAddSearchResults([]);
            }
        } catch {
            setAddSearchResults([]);
        }
        setAddSearchLoading(false);
    }, [addSearch]);

    /* ── Effects ───────────────────────────────────────────── */

    useEffect(() => { fetchLookups(); fetchFolders(); }, [fetchLookups, fetchFolders]);

    useEffect(() => {
        if (!selected) { setFolderPatients([]); return; }
        if (selected.kind === 'folder') fetchFolderPatients(selected.id);
        else fetchUnitPatients(selected.id);
    }, [selected, fetchFolderPatients, fetchUnitPatients]);

    useEffect(() => {
        if (!showAddPanel) {
            setAddPatients([]);
            setAddSearchResults([]);
            setSelectedIds(new Set());
            return;
        }
        if (addMode === 'unit') {
            if (addUnitId) fetchAddUnitPatients(addUnitId);
            else { setAddPatients([]); setSelectedIds(new Set()); }
        } else {
            setAddPatients([]);
        }
    }, [addMode, addUnitId, fetchAddUnitPatients, showAddPanel]);

    /* ── Folder Actions ────────────────────────────────────── */

    const createFolder = async () => {
        if (!newName.trim()) return; setSaving(true);
        try {
            const res = await fetch('/api/proxy/patient-folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }) });
            if (!res.ok) { showToast('Failed to create folder'); setSaving(false); return; }
            const created = parseFolder(await res.json());
            if (created) { setFolders(prev => [created, ...prev]); setSelected({ kind: 'folder', id: created.id, name: created.name }); }
            setNewName(''); setNewDesc(''); setShowCreate(false); showToast('Folder created');
        } catch { showToast('Failed to create folder'); } setSaving(false);
    };

    const renameFolder = async () => {
        if (!selectedFolder || !renameValue.trim()) return; setSaving(true);
        try {
            const res = await fetch(`/api/proxy/patient-folders/${selectedFolder.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: renameValue.trim() }) });
            if (!res.ok) { showToast('Failed to rename'); setSaving(false); return; }
            setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, name: renameValue.trim() } : f));
            setRenaming(false); showToast('Folder renamed');
        } catch { showToast('Failed to rename'); } setSaving(false);
    };

    const deleteFolder = async () => {
        if (!selectedFolder) return; setSaving(true);
        try {
            const res = await fetch(`/api/proxy/patient-folders/${selectedFolder.id}`, { method: 'DELETE' });
            if (!res.ok) { showToast('Failed to delete'); setSaving(false); return; }
            const next = folders.filter(f => f.id !== selectedFolder.id);
            setFolders(next); setSelected(null); showToast('Folder deleted');
        } catch { showToast('Failed to delete'); } setSaving(false);
    };

    const removePatientFromFolder = async (patientId: string) => {
        if (!selectedFolder) return; setSaving(true);
        try {
            const res = await fetch(`/api/proxy/patient-folders/${selectedFolder.id}/patients/${patientId}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 204) { showToast('Failed to remove'); setSaving(false); return; }
            showToast('Patient removed'); fetchFolderPatients(selectedFolder.id);
        } catch { showToast('Failed to remove'); } setSaving(false);
    };

    /* ── Add-by-unit actions ──────────────────────────────── */

    const toggleId = (id: string) => setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    const selectAll = () => {
        const source = addMode === 'unit' ? addPatients : addSearchResults;
        const eligible = source.filter(p => !folderPatients.some(fp => fp.id === p.id));
        setSelectedIds(new Set(eligible.map(p => p.id)));
    };
    const deselectAll = () => setSelectedIds(new Set());

    const addSelectedToFolder = async () => {
        if (!selectedFolder || selectedIds.size === 0) return; setSaving(true);
        try {
            const res = await fetch(`/api/proxy/patient-folders/${selectedFolder.id}/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_ids: Array.from(selectedIds) }) });
            if (!res.ok) { showToast('Failed to add patients'); setSaving(false); return; }
            showToast(`${selectedIds.size} patient${selectedIds.size !== 1 ? 's' : ''} added`);
            setSelectedIds(new Set());
            setShowAddPanel(false);
            setAddMode('unit');
            setAddUnitId('');
            setAddPatients([]);
            setAddSearch('');
            setAddSearchResults([]);
            fetchFolderPatients(selectedFolder.id);
        } catch { showToast('Failed to add patients'); } setSaving(false);
    };

    /* ── Render ────────────────────────────────────────────── */

    return (
        <div className="app-shell">
            <Sidebar sections={navSections} />

            {toast && (
                <div className="toast-enter" style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 18px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--success)' }}>check_circle</span>
                    {toast}
                </div>
            )}

            <div className="app-main">
                <TopBar title="Patient List" subtitle="Folders" />

                <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-900)' }}>
                    <div className="page-container">
                        <div className="split-layout" style={{ minHeight: 'calc(100vh - 140px)' }}>

                        {/* ═══════════ LEFT: FOLDER SIDEBAR ═══════════ */}
                        <div className="sticky-col">
                            <div className="sidebar-stack">

                            {/* Summary card */}
                            {summary && (
                                <div className="panel">
                                    <div className="panel-header">
                                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(30,58,95,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--helix-primary)' }}>groups</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                            <div className="panel-title">Patient List</div>
                                            <div className="panel-subtitle">Total across your facility</div>
                                        </div>
                                        <span style={{ flex: 1 }} />
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--helix-primary)', lineHeight: 1 }}>{summary.total_patients}</div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patients</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Unit Folders */}
                            {summary && summary.by_unit.length > 0 && (
                                <div className="panel">
                                    <div className="panel-header">
                                        <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--info)' }}>apartment</span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div className="panel-title">By Unit</div>
                                            <div className="panel-subtitle">Quick grouping</div>
                                        </div>
                                    </div>
                                    <div className="panel-body" style={{ padding: 10 }}>
                                        {summary.by_unit.map(u => {
                                            const active = selected?.kind === 'unit' && selected.id === u.unit_id;
                                            return (
                                                <button
                                                    key={`u-${u.unit_id}`}
                                                    type="button"
                                                    onClick={() => { setSelected({ kind: 'unit', id: u.unit_id, name: u.unit_name }); setShowAddPanel(false); }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        padding: '9px 10px',
                                                        borderRadius: 10,
                                                        border: '1px solid',
                                                        borderColor: active ? 'rgba(58,107,159,0.25)' : 'transparent',
                                                        cursor: 'pointer',
                                                        background: active ? 'rgba(58,107,159,0.08)' : 'transparent',
                                                        transition: 'all 0.12s',
                                                        textAlign: 'left',
                                                        width: '100%',
                                                    }}
                                                >
                                                    <span className="material-icons-round" style={{ fontSize: 18, color: active ? 'var(--info)' : 'var(--text-disabled)' }}>apartment</span>
                                                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 800 : 600, color: active ? 'var(--info)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.unit_name}</span>
                                                    <span className="badge badge-neutral" style={{ fontSize: 10, padding: '2px 8px', letterSpacing: '0.02em' }}>{u.patient_count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Custom Folders */}
                            <div className="panel">
                                <div className="panel-header">
                                    <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--helix-primary)' }}>folder</span>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div className="panel-title">Folders</div>
                                        <div className="panel-subtitle">Custom lists</div>
                                    </div>
                                    <span style={{ flex: 1 }} />
                                    <button onClick={() => setShowCreate(!showCreate)} className="btn btn-secondary btn-xs" style={{ padding: '4px 10px' }}>
                                        <span className="material-icons-round" style={{ fontSize: 14 }}>{showCreate ? 'close' : 'add'}</span>
                                        {showCreate ? 'Close' : 'New'}
                                    </button>
                                </div>

                                {showCreate && (
                                    <div className="panel-body fade-in" style={{ paddingTop: 10, paddingBottom: 10 }}>
                                        <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Folder name" style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
                                        <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
                                        <button className="btn btn-primary btn-xs" onClick={createFolder} disabled={saving || !newName.trim()} style={{ width: '100%' }}>Create</button>
                                    </div>
                                )}

                                {foldersLoading ? (
                                    <div className="panel-body" style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)' }}>Loading...</div>
                                ) : folders.length === 0 ? (
                                    <div className="panel-body" style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)' }}>No custom folders yet</div>
                                ) : (
                                    <div className="panel-body" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {folders.map(f => {
                                            const active = selected?.kind === 'folder' && selected.id === f.id;
                                            return (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => { setSelected({ kind: 'folder', id: f.id, name: f.name }); setShowAddPanel(false); setRenaming(false); }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        padding: '9px 10px',
                                                        borderRadius: 10,
                                                        border: '1px solid',
                                                        borderColor: active ? 'rgba(30,58,95,0.25)' : 'transparent',
                                                        cursor: 'pointer',
                                                        background: active ? 'rgba(30,58,95,0.08)' : 'transparent',
                                                        transition: 'all 0.12s',
                                                        textAlign: 'left',
                                                        width: '100%',
                                                    }}
                                                >
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: active ? 'var(--helix-primary)' : 'var(--text-disabled)' }}>folder</span>
                                                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 800 : 600, color: active ? 'var(--helix-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                                                    <span className="badge badge-neutral" style={{ fontSize: 10, padding: '2px 8px', letterSpacing: '0.02em' }}>{f.patient_count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            </div>
                        </div>

                        {/* ═══════════ RIGHT: FOLDER CONTENT ═══════════ */}
                        <div>
                            {!selected ? (
                                <div className="panel">
                                    <div className="panel-body" style={{ padding: '64px 44px', textAlign: 'center' }}>
                                    <span className="material-icons-round" style={{ fontSize: 48, color: 'var(--text-disabled)', display: 'block', marginBottom: 12 }}>folder_open</span>
                                    <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>Select a list</div>
                                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Pick a unit or folder on the left to view patients.</div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Folder header */}
                                    <div className="panel" style={{ marginBottom: 12 }}>
                                        <div className="panel-header">
                                        <span className="material-icons-round" style={{ fontSize: 22, color: selected.kind === 'unit' ? 'var(--info)' : 'var(--helix-primary)' }}>{selected.kind === 'unit' ? 'apartment' : 'folder_open'}</span>
                                        {renaming && selectedFolder ? (
                                            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                                                <input className="input" value={renameValue} onChange={e => setRenameValue(e.target.value)} style={{ fontSize: 13, height: 30, flex: 1 }} />
                                                <button className="btn btn-primary btn-xs" onClick={renameFolder} disabled={saving || !renameValue.trim()}>Save</button>
                                                <button className="btn btn-secondary btn-xs" onClick={() => setRenaming(false)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, lineHeight: 1.15 }}>
                                                    <span className="panel-title">{selected.name}</span>
                                                    <span className="panel-subtitle">{folderPatients.length} patient{folderPatients.length !== 1 ? 's' : ''}</span>
                                                </div>
                                            </>
                                        )}
                                        {selected.kind === 'folder' && !renaming && (
                                            <div style={{ display: 'flex', gap: 2 }}>
                                                <button
                                                    onClick={() => {
                                                        const next = !showAddPanel;
                                                        setShowAddPanel(next);
                                                        if (!next) {
                                                            setAddMode('unit');
                                                            setAddUnitId('');
                                                            setAddPatients([]);
                                                            setAddSearch('');
                                                            setAddSearchResults([]);
                                                            setSelectedIds(new Set());
                                                        }
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                                                    title="Add patients"
                                                >
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: showAddPanel ? 'var(--helix-primary)' : 'var(--text-muted)' }}>person_add</span>
                                                </button>
                                                <button onClick={() => { setRenaming(true); setRenameValue(selectedFolder?.name || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Rename">
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--text-muted)' }}>edit</span>
                                                </button>
                                                <button onClick={deleteFolder} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Delete">
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--danger)' }}>delete</span>
                                                </button>
                                            </div>
                                        )}
                                        </div>
                                    </div>

                                    {/* Add patients panel */}
                                    {showAddPanel && selectedFolder && (
                                        <div className="card fade-in" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--helix-primary)' }}>person_add</span>
                                                <span style={{ fontSize: 13, fontWeight: 700 }}>Add Patients</span>
                                                <span style={{ flex: 1 }} />
                                                <button
                                                    onClick={() => {
                                                        setShowAddPanel(false);
                                                        setAddMode('unit');
                                                        setAddUnitId('');
                                                        setAddPatients([]);
                                                        setAddSearch('');
                                                        setAddSearchResults([]);
                                                        setSelectedIds(new Set());
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                                                    title="Close"
                                                >
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--text-muted)' }}>close</span>
                                                </button>
                                            </div>

                                            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'inline-flex', borderRadius: 999, background: 'var(--surface-2)', padding: 2, border: '1px solid var(--border-subtle)' }}>
                                                    {(['unit', 'search'] as const).map(mode => (
                                                        <button
                                                            key={mode}
                                                            type="button"
                                                            onClick={() => {
                                                                setAddMode(mode);
                                                                setSelectedIds(new Set());
                                                                if (mode === 'unit') {
                                                                    setAddSearch('');
                                                                    setAddSearchResults([]);
                                                                } else {
                                                                    setAddUnitId('');
                                                                    setAddPatients([]);
                                                                }
                                                            }}
                                                            style={{
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                padding: '6px 12px',
                                                                borderRadius: 999,
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                letterSpacing: '0.02em',
                                                                background: addMode === mode ? 'var(--helix-primary)' : 'transparent',
                                                                color: addMode === mode ? '#fff' : 'var(--text-secondary)',
                                                                transition: 'all 0.12s',
                                                            }}
                                                        >
                                                            {mode === 'unit' ? 'By Unit' : 'Search'}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div style={{ flex: 1, minWidth: 260 }}>
                                                    {addMode === 'unit' ? (
                                                        <CustomSelect
                                                            value={addUnitId}
                                                            onChange={v => { setAddUnitId(v); setSelectedIds(new Set()); }}
                                                            options={[{ label: 'Select a unit...', value: '' }, ...units.map(u => ({ label: u.name, value: u.id }))]}
                                                            placeholder="Select unit"
                                                            style={{ width: '100%' }}
                                                        />
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <input
                                                                className="input"
                                                                placeholder="Search by patient name or MRN..."
                                                                value={addSearch}
                                                                onChange={e => setAddSearch(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') searchAddPatients(); }}
                                                                style={{ fontSize: 12, flex: 1 }}
                                                            />
                                                            <button className="btn btn-secondary btn-xs" onClick={searchAddPatients} disabled={!addSearch.trim() || addSearchLoading}>
                                                                {addSearchLoading ? 'Searching...' : 'Search'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {(addMode === 'unit' ? Boolean(addUnitId) : addSearch.trim().length > 0) && (
                                                <>
                                                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        {(() => {
                                                            const source = addMode === 'unit' ? addPatients : addSearchResults;
                                                            const label = addMode === 'unit' ? 'in unit' : 'matching search';
                                                            return (
                                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                                                                    {source.length} patient{source.length !== 1 ? 's' : ''} {label}
                                                                </span>
                                                            );
                                                        })()}
                                                        <span style={{ flex: 1 }} />
                                                        {selectedIds.size > 0 ? (
                                                            <button className="btn btn-secondary btn-xs" onClick={deselectAll}>Deselect All</button>
                                                        ) : (
                                                            <button className="btn btn-secondary btn-xs" onClick={selectAll} disabled={addMode === 'unit' ? addLoading : addSearchLoading}>
                                                                Select All
                                                            </button>
                                                        )}
                                                        <button className="btn btn-primary btn-xs" onClick={addSelectedToFolder} disabled={saving || selectedIds.size === 0}>
                                                            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                                                        </button>
                                                    </div>

                                                    {addMode === 'unit' ? (
                                                        addLoading ? (
                                                            <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Loading patients...</div>
                                                        ) : addPatients.length === 0 ? (
                                                            <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No patients in this unit</div>
                                                        ) : null
                                                    ) : addSearchLoading ? (
                                                        <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Searching patients...</div>
                                                    ) : addSearchResults.length === 0 ? (
                                                        <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No patients match this search</div>
                                                    ) : null}

                                                    {(() => {
                                                        const source = addMode === 'unit' ? addPatients : addSearchResults;
                                                        const shouldHide =
                                                            (addMode === 'unit' && (addLoading || addPatients.length === 0)) ||
                                                            (addMode === 'search' && (addSearchLoading || addSearchResults.length === 0));
                                                        if (shouldHide) return null;

                                                        return (
                                                            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                                                                {source.map(p => {
                                                                    const inFolder = folderPatients.some(fp => fp.id === p.id);
                                                                    const checked = selectedIds.has(p.id);
                                                                    return (
                                                                        <div
                                                                            key={p.id}
                                                                            onClick={() => { if (!inFolder) toggleId(p.id); }}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 10,
                                                                                padding: '8px 16px',
                                                                                borderBottom: '1px solid var(--border-subtle)',
                                                                                cursor: inFolder ? 'default' : 'pointer',
                                                                                opacity: inFolder ? 0.45 : 1,
                                                                                background: checked ? 'rgba(30,58,95,0.06)' : 'transparent',
                                                                                transition: 'background 0.1s',
                                                                            }}
                                                                        >
                                                                            <div style={{ width: 18, height: 18, borderRadius: 4, border: inFolder ? '1px solid var(--text-disabled)' : checked ? '1px solid var(--helix-primary)' : '1px solid var(--border-default)', background: inFolder ? 'var(--text-disabled)' : checked ? 'var(--helix-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                                                                                {(checked || inFolder) && <span className="material-icons-round" style={{ fontSize: 14, color: '#fff' }}>check</span>}
                                                                            </div>
                                                                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--helix-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                                                                {(p.first_name || 'U')[0]}{(p.last_name || 'P')[0]}
                                                                            </div>
                                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                    {p.first_name} {p.last_name}{inFolder ? ' (already in folder)' : ''}
                                                                                </div>
                                                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                                                    {p.medical_record_number ? `MRN: ${p.medical_record_number}` : 'MRN: -'}
                                                                                    {p.room ? ` · Rm ${p.room}${p.bed ? `/${p.bed}` : ''}` : ''}
                                                                                </div>
                                                                            </div>
                                                                            <span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 9, flexShrink: 0 }}>{p.status}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Patient table */}
                                    <div className="panel">
                                        <div className="table-wrapper">
                                        <table>
                                            <thead><tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                <th style={thStyle}>Patient</th><th style={thStyle}>MRN</th><th style={thStyle}>Unit</th><th style={thStyle}>Room/Bed</th><th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                                {selected.kind === 'folder' && <th style={{ ...thStyle, width: 40 }} />}
                                            </tr></thead>
                                            <tbody>
                                                {fpLoading && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><span className="material-icons-round" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--text-disabled)' }}>hourglass_empty</span>Loading...</td></tr>}
                                                {!fpLoading && folderPatients.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><span className="material-icons-round" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: 'var(--text-disabled)' }}>person_off</span>No patients{selected.kind === 'folder' ? ' in this folder' : ''}</td></tr>}
                                                {!fpLoading && folderPatients.map(p => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                        <td style={tdStyle}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--helix-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{(p.first_name || 'U')[0]}{(p.last_name || 'P')[0]}</div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.first_name} {p.last_name}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ ...tdStyle, fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5 }}>{p.medical_record_number || '-'}</td>
                                                        <td style={tdStyle}>{p.care_unit_name || '-'}</td>
                                                        <td style={tdStyle}>{[p.room, p.bed].filter(Boolean).join('/') || '-'}</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}><span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                                                        {selected.kind === 'folder' && (
                                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                                <button onClick={() => removePatientFromFolder(p.id)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-disabled)', transition: 'color 0.12s' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; }} title="Remove">
                                                                    <span className="material-icons-round" style={{ fontSize: 14 }}>close</span>
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
