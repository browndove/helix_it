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
    const [addUnitId, setAddUnitId] = useState('');
    const [addPatients, setAddPatients] = useState<Patient[]>([]);
    const [addLoading, setAddLoading] = useState(false);
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
            const params = new URLSearchParams({ page_size: '200', unit_id: uid });
            const res = await fetch(`/api/proxy/patients/directory?${params.toString()}`);
            if (res.ok) {
                const parsed = parsePaged(await res.json());
                setFolderPatients(parsed.items.map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name, medical_record_number: p.medical_record_number, status: p.status, room: p.room, bed: p.bed, care_unit_name: p.care_unit_name })));
            }
        } catch { /* silent */ }
        setFpLoading(false);
    }, []);

    const fetchAddUnitPatients = useCallback(async (uid: string) => {
        if (!uid) { setAddPatients([]); return; }
        setAddLoading(true);
        try {
            const params = new URLSearchParams({ page_size: '200', unit_id: uid });
            const res = await fetch(`/api/proxy/patients/directory?${params.toString()}`);
            if (res.ok) { const parsed = parsePaged(await res.json()); setAddPatients(parsed.items); }
        } catch { /* silent */ }
        setAddLoading(false);
    }, []);

    /* ── Effects ───────────────────────────────────────────── */

    useEffect(() => { fetchLookups(); fetchFolders(); }, [fetchLookups, fetchFolders]);

    useEffect(() => {
        if (!selected) { setFolderPatients([]); return; }
        if (selected.kind === 'folder') fetchFolderPatients(selected.id);
        else fetchUnitPatients(selected.id);
    }, [selected, fetchFolderPatients, fetchUnitPatients]);

    useEffect(() => {
        if (addUnitId) fetchAddUnitPatients(addUnitId);
        else { setAddPatients([]); setSelectedIds(new Set()); }
    }, [addUnitId, fetchAddUnitPatients]);

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
    const selectAll = () => { const eligible = addPatients.filter(p => !folderPatients.some(fp => fp.id === p.id)); setSelectedIds(new Set(eligible.map(p => p.id))); };
    const deselectAll = () => setSelectedIds(new Set());

    const addSelectedToFolder = async () => {
        if (!selectedFolder || selectedIds.size === 0) return; setSaving(true);
        try {
            const res = await fetch(`/api/proxy/patient-folders/${selectedFolder.id}/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_ids: Array.from(selectedIds) }) });
            if (!res.ok) { showToast('Failed to add patients'); setSaving(false); return; }
            showToast(`${selectedIds.size} patient${selectedIds.size !== 1 ? 's' : ''} added`);
            setSelectedIds(new Set()); setShowAddPanel(false); setAddUnitId(''); setAddPatients([]);
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

                <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'var(--bg-900)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 'calc(100vh - 140px)' }}>

                        {/* ═══════════ LEFT: FOLDER SIDEBAR ═══════════ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                            {/* Summary card */}
                            {summary && (
                                <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--helix-primary)' }}>groups</span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--helix-primary)', lineHeight: 1 }}>{summary.total_patients}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Total Patients</div>
                                    </div>
                                </div>
                            )}

                            {/* Unit Folders */}
                            {summary && summary.by_unit.length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '0 2px' }}>
                                        <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--info)' }}>apartment</span>
                                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>By Unit</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {summary.by_unit.map(u => {
                                            const active = selected?.kind === 'unit' && selected.id === u.unit_id;
                                            return (
                                                <button key={`u-${u.unit_id}`} type="button" onClick={() => { setSelected({ kind: 'unit', id: u.unit_id, name: u.unit_name }); setShowAddPanel(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: active ? 'rgba(59,130,246,0.08)' : 'transparent', transition: 'all 0.12s', textAlign: 'left', width: '100%' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: active ? 'var(--info)' : 'var(--text-disabled)' }}>apartment</span>
                                                    <span style={{ flex: 1, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--info)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.unit_name}</span>
                                                    <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, flexShrink: 0 }}>{u.patient_count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Custom Folders */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '0 2px' }}>
                                    <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--helix-primary)' }}>folder</span>
                                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Custom Folders</span>
                                    <span style={{ flex: 1 }} />
                                    <button onClick={() => setShowCreate(!showCreate)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title="New folder">
                                        <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--helix-primary)' }}>{showCreate ? 'close' : 'add'}</span>
                                    </button>
                                </div>

                                {showCreate && (
                                    <div className="card fade-in" style={{ padding: 10, marginBottom: 8 }}>
                                        <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Folder name" style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
                                        <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
                                        <button className="btn btn-primary btn-xs" onClick={createFolder} disabled={saving || !newName.trim()} style={{ width: '100%' }}>Create</button>
                                    </div>
                                )}

                                {foldersLoading ? (
                                    <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>Loading...</div>
                                ) : folders.length === 0 ? (
                                    <div style={{ padding: '12px 10px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>No custom folders yet</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {folders.map(f => {
                                            const active = selected?.kind === 'folder' && selected.id === f.id;
                                            return (
                                                <button key={f.id} type="button" onClick={() => { setSelected({ kind: 'folder', id: f.id, name: f.name }); setShowAddPanel(false); setRenaming(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: active ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'all 0.12s', textAlign: 'left', width: '100%' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: active ? 'var(--helix-primary)' : 'var(--text-disabled)' }}>folder</span>
                                                    <span style={{ flex: 1, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--helix-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                                                    <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, flexShrink: 0 }}>{f.patient_count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ═══════════ RIGHT: FOLDER CONTENT ═══════════ */}
                        <div>
                            {!selected ? (
                                <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
                                    <span className="material-icons-round" style={{ fontSize: 48, color: 'var(--text-disabled)', display: 'block', marginBottom: 12 }}>folder_open</span>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Select a folder</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-disabled)' }}>Choose a unit or custom folder from the sidebar to view its patients</div>
                                </div>
                            ) : (
                                <>
                                    {/* Folder header */}
                                    <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className="material-icons-round" style={{ fontSize: 22, color: selected.kind === 'unit' ? 'var(--info)' : 'var(--helix-primary)' }}>{selected.kind === 'unit' ? 'apartment' : 'folder_open'}</span>
                                        {renaming && selectedFolder ? (
                                            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                                                <input className="input" value={renameValue} onChange={e => setRenameValue(e.target.value)} style={{ fontSize: 13, height: 30, flex: 1 }} />
                                                <button className="btn btn-primary btn-xs" onClick={renameFolder} disabled={saving || !renameValue.trim()}>Save</button>
                                                <button className="btn btn-secondary btn-xs" onClick={() => setRenaming(false)}>Cancel</button>
                                            </div>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{selected.name}</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 600 }}>{folderPatients.length} patient{folderPatients.length !== 1 ? 's' : ''}</span>
                                            </>
                                        )}
                                        {selected.kind === 'folder' && !renaming && (
                                            <div style={{ display: 'flex', gap: 2 }}>
                                                <button onClick={() => setShowAddPanel(!showAddPanel)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Add patients">
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

                                    {/* Add-by-unit panel */}
                                    {showAddPanel && selectedFolder && (
                                        <div className="card fade-in" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--helix-primary)' }}>person_add</span>
                                                <span style={{ fontSize: 13, fontWeight: 700 }}>Add Patients by Unit</span>
                                                <span style={{ flex: 1 }} />
                                                <button onClick={() => { setShowAddPanel(false); setAddUnitId(''); setAddPatients([]); setSelectedIds(new Set()); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--text-muted)' }}>close</span>
                                                </button>
                                            </div>

                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                                                <CustomSelect value={addUnitId} onChange={v => { setAddUnitId(v); setSelectedIds(new Set()); }} options={[{ label: 'Select a unit...', value: '' }, ...units.map(u => ({ label: u.name, value: u.id }))]} placeholder="Select unit" style={{ width: '100%' }} />
                                            </div>

                                            {addUnitId && (
                                                <>
                                                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{addPatients.length} patient{addPatients.length !== 1 ? 's' : ''} in unit</span>
                                                        <span style={{ flex: 1 }} />
                                                        {selectedIds.size > 0 ? (
                                                            <button className="btn btn-secondary btn-xs" onClick={deselectAll}>Deselect All</button>
                                                        ) : (
                                                            <button className="btn btn-secondary btn-xs" onClick={selectAll} disabled={addLoading}>Select All</button>
                                                        )}
                                                        <button className="btn btn-primary btn-xs" onClick={addSelectedToFolder} disabled={saving || selectedIds.size === 0}>
                                                            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                                                        </button>
                                                    </div>

                                                    {addLoading ? (
                                                        <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Loading patients...</div>
                                                    ) : addPatients.length === 0 ? (
                                                        <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No patients in this unit</div>
                                                    ) : (
                                                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                                            {addPatients.map(p => {
                                                                const inFolder = folderPatients.some(fp => fp.id === p.id);
                                                                const checked = selectedIds.has(p.id);
                                                                return (
                                                                    <div key={p.id} onClick={() => { if (!inFolder) toggleId(p.id); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: inFolder ? 'default' : 'pointer', opacity: inFolder ? 0.45 : 1, background: checked ? 'rgba(99,102,241,0.06)' : 'transparent', transition: 'background 0.1s' }}>
                                                                        <div style={{ width: 18, height: 18, borderRadius: 4, border: inFolder ? '1px solid var(--text-disabled)' : checked ? '1px solid var(--helix-primary)' : '1px solid var(--border-default)', background: inFolder ? 'var(--text-disabled)' : checked ? 'var(--helix-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                                                                            {(checked || inFolder) && <span className="material-icons-round" style={{ fontSize: 14, color: '#fff' }}>check</span>}
                                                                        </div>
                                                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--helix-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{p.first_name[0]}{p.last_name[0]}</div>
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.first_name} {p.last_name}{inFolder ? ' (already in folder)' : ''}</div>
                                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.medical_record_number && `MRN: ${p.medical_record_number}`}{p.room && ` \u00b7 Rm ${p.room}${p.bed ? `/${p.bed}` : ''}`}</div>
                                                                        </div>
                                                                        <span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 9, flexShrink: 0 }}>{p.status}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Patient table */}
                                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                                </>
                            )}
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
