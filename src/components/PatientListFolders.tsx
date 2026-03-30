'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import navSections from '@/components/navSections';
import CustomSelect from '@/components/CustomSelect';

type Patient = {
    id: string;
    first_name: string;
    last_name: string;
    medical_record_number: string;
    status: string;
    room: string;
    bed: string;
    care_unit_name: string;
};

type Folder = {
    id: string;
    name: string;
    description: string;
    patientCount: number;
    patients: Patient[];
    createdAt: string;
};

function parsePatients(raw: unknown): Patient[] {
    const list = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object'
            ? ((raw as { items?: unknown; data?: unknown; patients?: unknown }).items
                || (raw as { items?: unknown; data?: unknown; patients?: unknown }).data
                || (raw as { items?: unknown; data?: unknown; patients?: unknown }).patients)
            : []);
    if (!Array.isArray(list)) return [];

    return list
        .map((p: unknown, idx) => {
            if (!p || typeof p !== 'object') return null;
            const rec = p as Record<string, unknown>;
            return {
                id: String(rec.id || rec.patient_id || `p-${idx}`),
                first_name: String(rec.first_name || '').trim(),
                last_name: String(rec.last_name || '').trim(),
                medical_record_number: String(rec.medical_record_number || rec.mrn || ''),
                status: String(rec.status || 'admitted'),
                room: String(rec.room || ''),
                bed: String(rec.bed || ''),
                care_unit_name: String(rec.care_unit_name || ''),
            };
        })
        .filter((p): p is Patient => Boolean(p));
}

function parseFolders(raw: unknown): Folder[] {
    const list = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object'
            ? ((raw as { items?: unknown; data?: unknown; folders?: unknown }).items
                || (raw as { items?: unknown; data?: unknown; folders?: unknown }).data
                || (raw as { items?: unknown; data?: unknown; folders?: unknown }).folders)
            : []);
    if (!Array.isArray(list)) return [];

    return list
        .map((f: unknown, idx): Folder | null => {
            if (!f || typeof f !== 'object') return null;
            const rec = f as Record<string, unknown>;
            const patientsRaw = Array.isArray(rec.patients) ? rec.patients as Record<string, unknown>[] : [];

            return {
                id: String(rec.id || `f-${idx}`),
                name: String(rec.name || 'Unnamed Folder'),
                description: String(rec.description || ''),
                patientCount: Number(rec.patient_count || patientsRaw.length || 0),
                createdAt: String(rec.created_at || '').slice(0, 10),
                patients: patientsRaw.map((p, pIdx) => ({
                    id: String(p.id || `p-${pIdx}`),
                    first_name: String(p.first_name || ''),
                    last_name: String(p.last_name || ''),
                    medical_record_number: String(p.medical_record_number || p.mrn || ''),
                    status: String(p.status || 'admitted'),
                    room: String(p.room || ''),
                    bed: String(p.bed || ''),
                    care_unit_name: String(p.care_unit_name || ''),
                })),
            };
        })
        .filter((f): f is Folder => Boolean(f));
}

const statusColor: Record<string, string> = {
    admitted: 'var(--critical)',
    discharged: 'var(--text-muted)',
    transferred: 'var(--warning)',
};

export default function PatientListFolders() {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [allPatients, setAllPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    // Create folder
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPatients, setNewPatients] = useState<{ id: string; name: string; mrn: string }[]>([]);

    // Add patient
    const [showAddPatient, setShowAddPatient] = useState(false);
    const [patientSearch, setPatientSearch] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

    // Edit folder
    const [editingFolder, setEditingFolder] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

    const fetchData = useCallback(async () => {
        try {
            const [folderRes, patientRes] = await Promise.all([
                fetch('/api/proxy/patient-folders'),
                fetch('/api/proxy/patients/directory?page_size=100&page_id=1'),
            ]);
            if (folderRes.ok) {
                const folderData = parseFolders(await folderRes.json());
                setFolders(folderData);
            }
            if (patientRes.ok) {
                const patientData = parsePatients(await patientRes.json());
                setAllPatients(patientData);
            }
        } catch {
            showToast('Failed to load patient folders');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const selectedFolder = folders.find(f => f.id === selectedFolderId) || null;

    // Fetch patients when a folder is selected
    useEffect(() => {
        if (!selectedFolderId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/proxy/patient-folders/${selectedFolderId}`);
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const patientsList = Array.isArray(data.patients) ? data.patients : [];
                if (!Array.isArray(patientsList) || cancelled) return;
                const parsed: Patient[] = patientsList.map((p: Record<string, unknown>, i: number) => ({
                    id: String(p.id || p.patient_id || `p-${i}`),
                    first_name: String(p.first_name || ''),
                    last_name: String(p.last_name || ''),
                    medical_record_number: String(p.medical_record_number || p.mrn || ''),
                    status: String(p.status || 'admitted'),
                    room: String(p.room || ''),
                    bed: String(p.bed || ''),
                    care_unit_name: String(p.care_unit_name || ''),
                }));
                setFolders(prev => prev.map(f =>
                    f.id === selectedFolderId ? { ...f, patients: parsed, patientCount: parsed.length } : f
                ));
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [selectedFolderId]);

    const filtered = folders.filter(f => {
        if (search.trim()) {
            const q = search.toLowerCase();
            return f.name.toLowerCase().includes(q) ||
                f.description.toLowerCase().includes(q) ||
                f.patients.some(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
                    p.medical_record_number.toLowerCase().includes(q));
        }
        return true;
    });

    const handleCreateFolder = async () => {
        if (!newName.trim()) return;
        const existing = folders.find(f => f.name.trim().toLowerCase() === newName.trim().toLowerCase());
        if (existing) {
            showToast(`Folder "${newName.trim()}" already exists`);
            return;
        }
        try {
            const res = await fetch('/api/proxy/patient-folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName.trim(),
                    description: newDesc.trim(),
                    visibility: 'public',
                }),
            });
            if (!res.ok) {
                showToast('Failed to create folder');
                return;
            }

            const created = await res.json();
            const folderId = String(created.id || created.folder_id || '');

            // POST all selected patients to /patient-folders/{id}/patients
            if (newPatients.length > 0) {
                try {
                    const pRes = await fetch(`/api/proxy/patient-folders/${folderId}/patients`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ patient_ids: newPatients.map(p => p.id) }),
                    });
                    if (!pRes.ok) {
                        console.error('Failed to add patients:', pRes.status);
                    }
                } catch (e) { console.error('Error adding patients:', e); }
            }

            // Re-fetch folder
            let finalFolder: Folder | null = null;
            try {
                const [refetchRes, patientsRes] = await Promise.all([
                    fetch(`/api/proxy/patient-folders/${folderId}`),
                    fetch(`/api/proxy/patient-folders/${folderId}/patients`),
                ]);
                if (refetchRes.ok) {
                    const refetched = await refetchRes.json();
                    finalFolder = parseFolders([refetched])[0] || null;
                }
                if (finalFolder && patientsRes.ok) {
                    const patientsData = await patientsRes.json();
                    const patientsList = Array.isArray(patientsData) ? patientsData : (patientsData?.items || patientsData?.data || patientsData?.patients || []);
                    if (Array.isArray(patientsList) && patientsList.length > 0) {
                        finalFolder = {
                            ...finalFolder,
                            patients: patientsList.map((p: Record<string, unknown>, i: number) => ({
                                id: String(p.id || p.patient_id || `p-${i}`),
                                first_name: String(p.first_name || ''),
                                last_name: String(p.last_name || ''),
                                medical_record_number: String(p.medical_record_number || p.mrn || ''),
                                status: String(p.status || 'admitted'),
                                room: String(p.room || ''),
                                bed: String(p.bed || ''),
                                care_unit_name: String(p.care_unit_name || ''),
                            })),
                            patientCount: patientsList.length,
                        };
                    }
                }
            } catch { /* fall back to local data */ }

            // Fallback: build from local data if re-fetch failed
            if (!finalFolder) {
                const parsed = parseFolders([created])[0];
                if (parsed) {
                    finalFolder = {
                        ...parsed,
                        patients: newPatients.map(p => ({
                            id: p.id,
                            first_name: p.name.split(' ')[0] || '',
                            last_name: p.name.split(' ').slice(1).join(' ') || '',
                            medical_record_number: p.mrn,
                            status: 'admitted',
                            room: '',
                            bed: '',
                            care_unit_name: '',
                        })),
                        patientCount: newPatients.length,
                    };
                }
            }

            if (finalFolder) {
                setFolders(prev => [...prev, finalFolder!]);
                setSelectedFolderId(finalFolder.id);
            }
            setShowCreate(false);
            setNewName('');
            setNewDesc('');
            setNewPatients([]);
            showToast(`Folder "${finalFolder?.name || newName.trim()}" created${newPatients.length > 0 ? ` with ${newPatients.length} patient${newPatients.length > 1 ? 's' : ''}` : ''}`);
        } catch {
            showToast('Failed to create folder');
        }
    };

    const handleDeleteFolder = async (id: string) => {
        const folder = folders.find(f => f.id === id);
        try {
            const res = await fetch(`/api/proxy/patient-folders/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                showToast('Failed to delete folder');
                return;
            }
            setFolders(prev => prev.filter(f => f.id !== id));
            if (selectedFolderId === id) setSelectedFolderId(null);
            showToast(`Folder "${folder?.name}" deleted`);
        } catch {
            showToast('Failed to delete folder');
        }
    };

    const existingPatientIds = selectedFolder ? selectedFolder.patients.map(p => p.id) : [];
    const filteredPatients = allPatients.filter(p => {
        if (existingPatientIds.includes(p.id.toString())) return false;
        if (patientSearch.trim()) {
            const q = patientSearch.toLowerCase();
            return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
                p.medical_record_number.toLowerCase().includes(q);
        }
        return true;
    });

    const selectedPatient = allPatients.find(p => p.id === selectedPatientId) || null;

    const handleAddPatient = async () => {
        if (!selectedPatient || !selectedFolder) return;
        try {
            const res = await fetch(`/api/proxy/patient-folders/${selectedFolder.id}/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_ids: [selectedPatient.id] }),
            });
            if (!res.ok) {
                showToast('Failed to add patient');
                return;
            }
            const patient: Patient = {
                id: selectedPatient.id.toString(),
                first_name: selectedPatient.first_name,
                last_name: selectedPatient.last_name,
                medical_record_number: selectedPatient.medical_record_number,
                status: selectedPatient.status,
                room: selectedPatient.room,
                bed: selectedPatient.bed,
                care_unit_name: selectedPatient.care_unit_name,
            };
            setFolders(prev => prev.map(f =>
                f.id === selectedFolder.id
                    ? { ...f, patients: [...f.patients, patient], patientCount: (f.patientCount || f.patients.length) + 1 }
                    : f
            ));
            setShowAddPatient(false);
            setPatientSearch('');
            setSelectedPatientId(null);
            showToast(`${patient.first_name} ${patient.last_name} added`);
        } catch {
            showToast('Failed to add patient');
        }
    };

    const handleRemovePatient = async (patientId: string) => {
        if (!selectedFolder) return;
        const patient = selectedFolder.patients.find(p => p.id === patientId);
        try {
            const res = await fetch(`/api/proxy/patient-folders/${selectedFolder.id}/patients/${patientId}`, { method: 'DELETE' });
            if (!res.ok) {
                showToast('Failed to remove patient');
                return;
            }
            setFolders(prev => prev.map(f =>
                f.id === selectedFolder.id
                    ? { ...f, patients: f.patients.filter(p => p.id !== patientId), patientCount: Math.max((f.patientCount || f.patients.length) - 1, 0) }
                    : f
            ));
            showToast(`${patient?.first_name} ${patient?.last_name} removed`);
        } catch {
            showToast('Failed to remove patient');
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedFolder || !editName.trim()) return;
        try {
            const res = await fetch(`/api/proxy/patient-folders/${selectedFolder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDesc.trim(),
                }),
            });
            if (!res.ok) {
                showToast('Failed to update folder');
                return;
            }
            const updated = await res.json();
            const parsed = parseFolders([updated])[0];
            setFolders(prev => prev.map(f => (f.id === selectedFolder.id ? (parsed || f) : f)));
            setEditingFolder(false);
            showToast('Folder updated');
        } catch {
            showToast('Failed to update folder');
        }
    };

    const openEdit = () => {
        if (!selectedFolder) return;
        setEditName(selectedFolder.name);
        setEditDesc(selectedFolder.description);
        setEditingFolder(true);
    };

    const detailOpen = selectedFolder || showCreate;

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
                <TopBar title="Patient List Folders" subtitle="Manage patient folders for doctors" />

                <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px', background: 'var(--bg-900)' }}>
                    {/* Filters */}
                    <div className="fade-in" style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
                            <span className="material-icons-round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-disabled)', pointerEvents: 'none' }}>search</span>
                            <input
                                className="input"
                                placeholder="Search folders or patients..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: 34, fontSize: 12.5, height: 36, width: '100%' }}
                            />
                        </div>

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} folder{filtered.length !== 1 ? 's' : ''}</span>
                            <button className="btn btn-primary btn-sm" onClick={() => { setShowCreate(!showCreate); setSelectedFolderId(null); setEditingFolder(false); }}>
                                <span className="material-icons-round" style={{ fontSize: 14 }}>{showCreate ? 'close' : 'add'}</span>
                                {showCreate ? 'Cancel' : 'New Folder'}
                            </button>
                        </div>
                    </div>

                    {/* Table + Detail Panel */}
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: detailOpen ? '1fr 380px' : '1fr', gap: 20, alignItems: 'start' }}>
                        {/* Folders Table */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40%' }}>Folder Name</th>
                                            <th>Description</th>
                                            <th style={{ textAlign: 'center' }}>Patients</th>
                                            <th>Created</th>
                                            <th style={{ width: 60, textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading folders...</td></tr>
                                        ) : filtered.length === 0 ? (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>No folders found</td></tr>
                                        ) : filtered.map(folder => {
                                            const isSelected = selectedFolderId === folder.id;
                                            const totalPatients = folder.patientCount || folder.patients.length;
                                            return (
                                                <tr
                                                    key={folder.id}
                                                    onClick={() => { setSelectedFolderId(isSelected ? null : folder.id); setShowCreate(false); setEditingFolder(false); setShowAddPatient(false); }}
                                                    style={{
                                                        cursor: 'pointer', transition: 'background 0.12s',
                                                        background: isSelected ? 'rgba(59,130,246,0.04)' : undefined,
                                                    }}
                                                >
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                                                                background: isSelected ? 'var(--helix-primary)' : 'var(--surface-2)',
                                                                color: isSelected ? '#fff' : 'var(--text-secondary)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 12, flexShrink: 0,
                                                            }}>
                                                                <span className="material-icons-round" style={{ fontSize: 16 }}>folder</span>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{folder.name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.description || '—'}</td>
                                                    <td style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 600 }}>{totalPatients}</td>
                                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{folder.createdAt || '—'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="btn btn-danger btn-xs"
                                                            onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                                            title="Delete folder"
                                                            style={{ padding: '3px 6px' }}
                                                        >
                                                            <span className="material-icons-round" style={{ fontSize: 13 }}>delete</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Detail / Create Panel */}
                        {showCreate && (
                            <div className="fade-in card" style={{ position: 'sticky', top: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>Create Folder</h3>
                                    <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>close</span>
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label className="label">Folder Name</label>
                                        <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. ICU Patients" style={{ fontSize: 13 }} />
                                    </div>
                                    <div>
                                        <label className="label">Description</label>
                                        <textarea className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of the folder" style={{ fontSize: 13, minHeight: 60, resize: 'vertical' }} />
                                    </div>

                                    {/* Patients picker */}
                                    <div>
                                        <label className="label">Patients{newPatients.length > 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> ({newPatients.length})</span>}</label>
                                        <CustomSelect
                                            value=""
                                            onChange={v => {
                                                if (!v) return;
                                                const p = allPatients.find(x => x.id === v);
                                                if (p && !newPatients.some(m => m.id === v)) {
                                                    setNewPatients(prev => [...prev, { id: p.id, name: `${p.first_name} ${p.last_name}`, mrn: p.medical_record_number }]);
                                                }
                                            }}
                                            options={allPatients
                                                .filter(p => !newPatients.some(m => m.id === p.id))
                                                .map(p => ({ label: `${p.first_name} ${p.last_name} — ${p.medical_record_number}`, value: p.id }))}
                                            placeholder="Select patients to add..."
                                        />
                                        {newPatients.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                                {newPatients.map(p => (
                                                    <span key={p.id} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px 3px 8px',
                                                        borderRadius: 14, fontSize: 11, fontWeight: 600,
                                                        background: 'rgba(99,102,241,0.08)', color: 'var(--helix-primary)',
                                                        border: '1px solid rgba(99,102,241,0.18)',
                                                    }}>
                                                        {p.name}
                                                        <button type="button" onClick={() => setNewPatients(prev => prev.filter(x => x.id !== p.id))}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--helix-primary)', padding: 0, display: 'inline-flex', marginLeft: 2 }}>
                                                            <span className="material-icons-round" style={{ fontSize: 13 }}>close</span>
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="btn btn-primary btn-sm" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={handleCreateFolder} disabled={!newName.trim()}>
                                    <span className="material-icons-round" style={{ fontSize: 14 }}>add</span>
                                    Create Folder{newPatients.length > 0 ? ` with ${newPatients.length} patient${newPatients.length > 1 ? 's' : ''}` : ''}
                                </button>
                            </div>
                        )}

                        {selectedFolder && !showCreate && (
                            <div className="fade-in card" style={{ position: 'sticky', top: 24 }}>
                                {editingFolder ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Edit Folder</h3>
                                            <button onClick={() => setEditingFolder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                                                <span className="material-icons-round" style={{ fontSize: 16 }}>close</span>
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div>
                                                <label className="label">Folder Name</label>
                                                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: 13 }} />
                                            </div>
                                            <div>
                                                <label className="label">Description</label>
                                                <textarea className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ fontSize: 13, minHeight: 60, resize: 'vertical' }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                            <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSaveEdit} disabled={!editName.trim()}>Save Changes</button>
                                            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditingFolder(false)}>Cancel</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 3 }}>{selectedFolder.name}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {selectedFolder.createdAt && <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{selectedFolder.createdAt}</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 2 }}>
                                                <button onClick={openEdit} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--surface-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.12s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--helix-primary)'; e.currentTarget.style.color = 'var(--helix-primary)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                                    <span className="material-icons-round" style={{ fontSize: 14 }}>edit</span>
                                                </button>
                                                <button onClick={() => setSelectedFolderId(null)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)', transition: 'color 0.12s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; }}>
                                                    <span className="material-icons-round" style={{ fontSize: 16 }}>close</span>
                                                </button>
                                            </div>
                                        </div>

                                        {selectedFolder.description && (
                                            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{selectedFolder.description}</p>
                                        )}

                                        {/* Info row */}
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                                            <div style={{ flexShrink: 0, width: 64, padding: '10px 8px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--helix-primary)', lineHeight: 1 }}>{selectedFolder.patients.length}</div>
                                                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3 }}>Patients</div>
                                            </div>
                                        </div>

                                        {/* Divider + Patients header */}
                                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Patients</span>
                                                <button onClick={() => setShowAddPatient(!showAddPatient)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: showAddPatient ? 'var(--surface-2)' : 'var(--helix-primary)', color: showAddPatient ? 'var(--text-secondary)' : '#fff', transition: 'all 0.15s' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 13 }}>{showAddPatient ? 'close' : 'person_add'}</span>
                                                    {showAddPatient ? 'Cancel' : 'Add'}
                                                </button>
                                            </div>
                                        </div>

                                        {showAddPatient && (
                                            <div style={{
                                                display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: 10,
                                                background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border-subtle)',
                                            }}>
                                                <CustomSelect
                                                    value=""
                                                    onChange={v => {
                                                        if (!v) return;
                                                        const p = allPatients.find(x => x.id === v);
                                                        if (p) { setSelectedPatientId(p.id); }
                                                    }}
                                                    options={allPatients
                                                        .filter(p => !selectedFolder.patients.some(m => m.id === p.id))
                                                        .map(p => ({ label: `${p.first_name} ${p.last_name} — ${p.medical_record_number}`, value: p.id }))}
                                                    placeholder="Select patient..."
                                                />

                                                {selectedPatient && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: 'var(--surface-card)', border: '1px solid var(--helix-primary)' }}>
                                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--helix-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                                            {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 12, fontWeight: 600 }}>{selectedPatient.first_name} {selectedPatient.last_name}</div>
                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{selectedPatient.medical_record_number}</div>
                                                        </div>
                                                        <button className="btn btn-primary btn-xs" onClick={handleAddPatient} style={{ padding: '4px 10px' }}>
                                                            <span className="material-icons-round" style={{ fontSize: 12 }}>add</span>Add
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {selectedFolder.patients.length === 0 ? (
                                            <div style={{ padding: '24px 0', textAlign: 'center' }}>
                                                <span className="material-icons-round" style={{ fontSize: 28, color: 'var(--border-default)', marginBottom: 6, display: 'block' }}>folder_off</span>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No patients yet</div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {selectedFolder.patients.map((patient, idx) => (
                                                    <div key={patient.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
                                                        borderRadius: 6, transition: 'background 0.1s',
                                                        background: idx % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                                                    }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--surface-2)'; }}
                                                    >
                                                        <div style={{
                                                            width: 28, height: 28, borderRadius: '50%',
                                                            background: 'var(--helix-primary)',
                                                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                                                        }}>
                                                            {patient.first_name[0]}{patient.last_name[0]}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{patient.first_name} {patient.last_name}</div>
                                                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {patient.medical_record_number}
                                                                {patient.status && (
                                                                    <>
                                                                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: statusColor[patient.status] || 'var(--text-muted)', flexShrink: 0 }} />
                                                                        <span style={{ color: statusColor[patient.status], fontWeight: 600, fontSize: 10 }}>{patient.status}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemovePatient(patient.id)}
                                                            title="Remove"
                                                            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)', transition: 'all 0.12s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--critical)'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; e.currentTarget.style.background = 'transparent'; }}
                                                        >
                                                            <span className="material-icons-round" style={{ fontSize: 14 }}>remove_circle_outline</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
