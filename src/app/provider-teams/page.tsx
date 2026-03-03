'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import navSections from '@/components/navSections';

type Member = {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    status: string;
};

type Team = {
    id: string;
    name: string;
    departmentId?: string;
    department: string;
    description: string;
    lead: string;
    leadId?: string;
    memberCount: number;
    members: Member[];
    createdAt: string;
};

const roleOptions = ['Team Lead', 'Charge Nurse', 'Nurse', 'Resident', 'Surgeon', 'Intensivist', 'ICU Nurse', 'Anesthesiologist', 'Scrub Nurse', 'Pediatrician', 'Physician'];

type StaffEntry = { id: string; first_name: string; last_name: string; job_title: string; dept: string; employee_id: string };

type DepartmentEntry = { id: string; name: string };

const statusColor: Record<string, string> = {
    Active: 'var(--success)',
    'On Leave': 'var(--warning)',
    'Off Duty': 'var(--text-muted)',
};

function toStatusLabel(status?: string): 'Active' | 'On Leave' | 'Off Duty' {
    const s = (status || '').toLowerCase();
    if (s.includes('leave')) return 'On Leave';
    if (s.includes('off')) return 'Off Duty';
    return 'Active';
}

function parseDepartments(raw: unknown): DepartmentEntry[] {
    const list = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object'
            ? ((raw as { items?: unknown; data?: unknown; departments?: unknown }).items
                || (raw as { items?: unknown; data?: unknown; departments?: unknown }).data
                || (raw as { items?: unknown; data?: unknown; departments?: unknown }).departments)
            : []);
    if (!Array.isArray(list)) return [];

    return list
        .map((d: unknown) => {
            if (!d || typeof d !== 'object') return null;
            const rec = d as { id?: string; department_id?: string; name?: string; department_name?: string };
            const id = rec.id || rec.department_id || '';
            const name = rec.name || rec.department_name || '';
            return id && name ? { id, name } : null;
        })
        .filter((d): d is DepartmentEntry => Boolean(d));
}

function parseStaff(raw: unknown): StaffEntry[] {
    const list = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object'
            ? ((raw as { items?: unknown; data?: unknown; staff?: unknown }).items
                || (raw as { items?: unknown; data?: unknown; staff?: unknown }).data
                || (raw as { items?: unknown; data?: unknown; staff?: unknown }).staff)
            : []);
    if (!Array.isArray(list)) return [];

    return list
        .map((s: unknown, idx) => {
            if (!s || typeof s !== 'object') return null;
            const rec = s as Record<string, unknown>;
            return {
                id: String(rec.id || rec.staff_id || `s-${idx}`),
                first_name: String(rec.first_name || '').trim(),
                last_name: String(rec.last_name || '').trim(),
                job_title: String(rec.job_title || rec.role || 'Staff'),
                dept: String(rec.department_name || rec.department || rec.dept || 'Unassigned'),
                employee_id: String(rec.employee_id || rec.username || rec.id || `EMP-${idx}`),
            };
        })
        .filter((s): s is StaffEntry => Boolean(s));
}

function parseTeams(raw: unknown, departments: DepartmentEntry[]): Team[] {
    const list = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object'
            ? ((raw as { items?: unknown; data?: unknown; teams?: unknown }).items
                || (raw as { items?: unknown; data?: unknown; teams?: unknown }).data
                || (raw as { items?: unknown; data?: unknown; teams?: unknown }).teams)
            : []);
    if (!Array.isArray(list)) return [];

    const deptNameById = new Map(departments.map(d => [d.id, d.name]));

    return list
        .map((t: unknown, idx): Team | null => {
            if (!t || typeof t !== 'object') return null;
            const rec = t as Record<string, unknown>;
            const depId = String(rec.department_id || '');
            const leadObj = (rec.lead && typeof rec.lead === 'object') ? rec.lead as Record<string, unknown> : {};
            const membersRaw = Array.isArray(rec.members) ? rec.members as Record<string, unknown>[] : [];

            return {
                id: String(rec.id || `t-${idx}`),
                name: String(rec.name || 'Unnamed Team'),
                departmentId: depId || undefined,
                department: String(rec.department_name || deptNameById.get(depId) || 'Unassigned'),
                description: String(rec.description || ''),
                lead: `${String(leadObj.first_name || '').trim()} ${String(leadObj.last_name || '').trim()}`.trim() || 'Unassigned',
                leadId: String(leadObj.id || rec.lead_id || ''),
                memberCount: Number(rec.member_count || membersRaw.length || 0),
                createdAt: String(rec.created_at || '').slice(0, 10),
                members: membersRaw.map((m, mIdx) => ({
                    id: String(m.id || `m-${mIdx}`),
                    firstName: String(m.first_name || ''),
                    lastName: String(m.last_name || ''),
                    jobTitle: String(m.job_title || 'Staff'),
                    status: toStatusLabel(String(m.status || 'active')),
                })),
            };
        })
        .filter((t): t is Team => Boolean(t));
}

export default function ProviderTeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [allStaff, setAllStaff] = useState<StaffEntry[]>([]);
    const [departments, setDepartments] = useState<DepartmentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [toast, setToast] = useState<string | null>(null);

    // Create team
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDeptId, setNewDeptId] = useState('');
    const [newLeadId, setNewLeadId] = useState('');
    const [newDesc, setNewDesc] = useState('');

    // Add member
    const [showAddMember, setShowAddMember] = useState(false);
    const [staffSearch, setStaffSearch] = useState('');
    const [staffDeptFilter, setStaffDeptFilter] = useState('All');
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [memberRole, setMemberRole] = useState(roleOptions[0]);

    // Edit team
    const [editingTeam, setEditingTeam] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editDept, setEditDept] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

    const fetchData = useCallback(async () => {
        try {
            const [teamRes, deptRes, staffRes] = await Promise.all([
                fetch('/api/proxy/teams'),
                fetch('/api/proxy/departments'),
                fetch('/api/proxy/staff?page_size=100&page_id=1'),
            ]);
            const deptData = deptRes.ok ? parseDepartments(await deptRes.json()) : [];
            setDepartments(deptData);
            if (staffRes.ok) {
                const staffData = parseStaff(await staffRes.json());
                setAllStaff(staffData);
            }
            if (teamRes.ok) {
                const teamData = parseTeams(await teamRes.json(), deptData);
                setTeams(teamData);
            }
            if (deptData.length > 0 && !newDeptId) setNewDeptId(deptData[0].id);
        } catch {
            showToast('Failed to load provider teams');
        }
        setLoading(false);
    }, [newDeptId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const departmentFilters = useMemo(() => ['All', ...departments.map(d => d.name)], [departments]);
    const staffDepartments = useMemo(() => ['All', ...Array.from(new Set(allStaff.map(s => s.dept)))], [allStaff]);

    const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;

    const filtered = teams.filter(t => {
        if (deptFilter !== 'All' && t.department !== deptFilter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return t.name.toLowerCase().includes(q) ||
                t.department.toLowerCase().includes(q) ||
                t.lead.toLowerCase().includes(q) ||
                t.members.some(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q));
        }
        return true;
    });

    const handleCreateTeam = async () => {
        if (!newName.trim()) return;
        const existing = teams.find(t =>
            t.name.trim().toLowerCase() === newName.trim().toLowerCase() &&
            (newDeptId ? t.departmentId === newDeptId : true)
        );
        if (existing) {
            showToast(`Team "${newName.trim()}" already exists in this department`);
            return;
        }
        try {
            const res = await fetch('/api/proxy/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName.trim(),
                    description: newDesc.trim(),
                    department_id: newDeptId || undefined,
                    lead_id: newLeadId || undefined,
                }),
            });
            if (!res.ok) {
                let errorMsg = 'Failed to create team';
                try {
                    const err = await res.json();
                    const details = err?.detail || err?.details || err?.error || err?.message;
                    if (res.status === 409) {
                        errorMsg = typeof details === 'string' && details.trim()
                            ? `Team already exists: ${details}`
                            : 'Team already exists';
                    } else if (typeof details === 'string' && details.trim()) {
                        errorMsg = details;
                    }
                } catch {}
                showToast(errorMsg);
                return;
            }

            const created = await res.json();
            const parsed = parseTeams([created], departments)[0];
            if (parsed) setTeams(prev => [...prev, parsed]);
            setShowCreate(false);
            setNewName('');
            setNewDesc('');
            setNewLeadId('');
            showToast(`Team "${parsed?.name || newName.trim()}" created`);
        } catch {
            showToast('Failed to create team');
        }
    };

    const handleDeleteTeam = async (id: string) => {
        const team = teams.find(t => t.id === id);
        try {
            const res = await fetch(`/api/proxy/teams/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                showToast('Failed to delete team');
                return;
            }
            setTeams(prev => prev.filter(t => t.id !== id));
            if (selectedTeamId === id) setSelectedTeamId(null);
            showToast(`Team "${team?.name}" deleted`);
        } catch {
            showToast('Failed to delete team');
        }
    };

    const existingMemberIds = selectedTeam ? selectedTeam.members.map(m => m.id) : [];
    const filteredStaff = allStaff.filter(s => {
        if (existingMemberIds.includes(s.id.toString())) return false;
        if (staffDeptFilter !== 'All' && s.dept !== staffDeptFilter) return false;
        if (staffSearch.trim()) {
            const q = staffSearch.toLowerCase();
            return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
                s.job_title.toLowerCase().includes(q) ||
                s.employee_id.toLowerCase().includes(q);
        }
        return true;
    });

    const selectedStaff = allStaff.find(s => s.id === selectedStaffId) || null;

    const handleAddMember = () => {
        if (!selectedStaff || !selectedTeam) return;
        const member: Member = {
            id: selectedStaff.id.toString(),
            firstName: selectedStaff.first_name,
            lastName: selectedStaff.last_name,
            jobTitle: memberRole,
            status: 'Active',
        };
        setTeams(prev => prev.map(t =>
            t.id === selectedTeam.id
                ? { ...t, members: [...t.members, member], memberCount: (t.memberCount || t.members.length) + 1 }
                : t
        ));
        setShowAddMember(false);
        setStaffSearch('');
        setStaffDeptFilter('All');
        setSelectedStaffId(null);
        setMemberRole(roleOptions[0]);
        showToast(`${member.firstName} ${member.lastName} added`);
    };

    const handleRemoveMember = (memberId: string) => {
        if (!selectedTeam) return;
        const member = selectedTeam.members.find(m => m.id === memberId);
        setTeams(prev => prev.map(t =>
            t.id === selectedTeam.id
                ? { ...t, members: t.members.filter(m => m.id !== memberId), memberCount: Math.max((t.memberCount || t.members.length) - 1, 0) }
                : t
        ));
        showToast(`${member?.firstName} ${member?.lastName} removed`);
    };

    const handleSaveEdit = async () => {
        if (!selectedTeam || !editName.trim()) return;
        try {
            const dep = departments.find(d => d.name === editDept);
            const res = await fetch(`/api/proxy/teams/${selectedTeam.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDesc.trim(),
                    department_id: dep?.id || selectedTeam.departmentId,
                    lead_id: selectedTeam.leadId || undefined,
                }),
            });
            if (!res.ok) {
                showToast('Failed to update team');
                return;
            }
            const updated = await res.json();
            const parsed = parseTeams([updated], departments)[0];
            setTeams(prev => prev.map(t => (t.id === selectedTeam.id ? (parsed || t) : t)));
            setEditingTeam(false);
            showToast('Team updated');
        } catch {
            showToast('Failed to update team');
        }
    };

    const openEdit = () => {
        if (!selectedTeam) return;
        setEditName(selectedTeam.name);
        setEditDesc(selectedTeam.description);
        setEditDept(selectedTeam.department);
        setEditingTeam(true);
    };

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
                <TopBar title="Provider Teams" subtitle="Manage clinical teams and their members" />

                <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px', background: 'var(--bg-900)' }}>
                    {/* Filters + Create */}
                    <div className="fade-in" style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
                            <span className="material-icons-round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-disabled)', pointerEvents: 'none' }}>search</span>
                            <input
                                className="input"
                                placeholder="Search teams or members..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: 34, fontSize: 12.5, height: 36, width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: 3 }}>
                            {departmentFilters.map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDeptFilter(d)}
                                    style={{
                                        padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                                        fontSize: 11, fontWeight: deptFilter === d ? 600 : 500,
                                        color: deptFilter === d ? 'var(--helix-primary)' : 'var(--text-secondary)',
                                        background: deptFilter === d ? '#fff' : 'transparent',
                                        border: deptFilter === d ? '1px solid var(--border-default)' : '1px solid transparent',
                                        boxShadow: deptFilter === d ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>

                        <div style={{ marginLeft: 'auto' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
                                <span className="material-icons-round" style={{ fontSize: 14 }}>{showCreate ? 'close' : 'add'}</span>
                                {showCreate ? 'Cancel' : 'New Team'}
                            </button>
                        </div>
                    </div>

                    {/* Create Team Form */}
                    {showCreate && (
                        <div className="fade-in card" style={{ marginBottom: 18, maxWidth: 520 }}>
                            <h3 style={{ marginBottom: 14 }}>Create Team</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <label className="label">Team Name</label>
                                    <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Cardiology Team B" style={{ fontSize: 13 }} />
                                </div>
                                <div>
                                    <label className="label">Department</label>
                                    <select className="input" value={newDeptId} onChange={e => setNewDeptId(e.target.value)} style={{ fontSize: 13 }}>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Lead</label>
                                    <select className="input" value={newLeadId} onChange={e => setNewLeadId(e.target.value)} style={{ fontSize: 13 }}>
                                        <option value="">Unassigned</option>
                                        {allStaff.map(s => (
                                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.job_title})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of the team" style={{ fontSize: 13 }} />
                                </div>
                            </div>
                            <button className="btn btn-primary btn-sm" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={handleCreateTeam} disabled={!newName.trim()}>
                                Create Team
                            </button>
                        </div>
                    )}

                    {/* Main Content: Teams List + Detail */}
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: selectedTeam ? '1fr 1fr' : '1fr', gap: 20 }}>
                        {/* Teams List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {filtered.length === 0 ? (
                                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>No teams found</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Try adjusting your search or filters</div>
                                </div>
                            ) : (
                                filtered.map(team => {
                                    const isSelected = selectedTeamId === team.id;
                                    const activeCount = team.members.filter(m => m.status === 'Active').length;
                                    const totalMembers = team.memberCount || team.members.length;
                                    return (
                                        <div
                                            key={team.id}
                                            className="card"
                                            onClick={() => { setSelectedTeamId(isSelected ? null : team.id); setEditingTeam(false); setShowAddMember(false); }}
                                            style={{
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                border: isSelected ? '1px solid var(--helix-primary)' : '1px solid var(--border-default)',
                                                background: isSelected ? 'rgba(59,130,246,0.03)' : 'var(--surface-card)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        <h3 style={{ fontSize: 14, fontWeight: 700 }}>{team.name}</h3>
                                                        <span style={{
                                                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                                                            background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)',
                                                        }}>
                                                            {team.department}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{team.description}</p>
                                                    <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                                        <span><strong>{totalMembers}</strong> members</span>
                                                        <span><strong>{activeCount}</strong> active</span>
                                                        <span>Lead: <strong>{team.lead}</strong></span>
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-danger btn-xs"
                                                    onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                                                    title="Delete team"
                                                >
                                                    <span className="material-icons-round" style={{ fontSize: 12 }}>delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Detail Panel */}
                        {selectedTeam && (
                            <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 24 }}>
                                {editingTeam ? (
                                    <>
                                        <h3 style={{ marginBottom: 14 }}>Edit Team</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div>
                                                <label className="label">Team Name</label>
                                                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: 13 }} />
                                            </div>
                                            <div>
                                                <label className="label">Department</label>
                                                <select className="input" value={editDept} onChange={e => setEditDept(e.target.value)} style={{ fontSize: 13 }}>
                                                    {departments.map(d => (
                                                        <option key={d.id} value={d.name}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Description</label>
                                                <input className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ fontSize: 13 }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                            <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSaveEdit} disabled={!editName.trim()}>Save</button>
                                            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditingTeam(false)}>Cancel</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div>
                                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{selectedTeam.name}</h3>
                                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedTeam.department} · Created {selectedTeam.createdAt}</p>
                                            </div>
                                            <button className="btn btn-secondary btn-xs" onClick={openEdit}>
                                                <span className="material-icons-round" style={{ fontSize: 12 }}>edit</span>
                                                Edit
                                            </button>
                                        </div>

                                        {selectedTeam.description && (
                                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{selectedTeam.description}</p>
                                        )}

                                        {/* Members */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                                                Members ({selectedTeam.members.length})
                                            </h4>
                                            <button className="btn btn-primary btn-xs" onClick={() => setShowAddMember(!showAddMember)}>
                                                <span className="material-icons-round" style={{ fontSize: 12 }}>{showAddMember ? 'close' : 'person_add'}</span>
                                                {showAddMember ? 'Cancel' : 'Add'}
                                            </button>
                                        </div>

                                        {showAddMember && (
                                            <div style={{
                                                display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: 12,
                                                background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
                                            }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                                    <div style={{ flex: 1, position: 'relative' }}>
                                                        <label className="label">Search Staff</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <span className="material-icons-round" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-disabled)', pointerEvents: 'none' }}>search</span>
                                                            <input className="input" value={staffSearch} onChange={e => { setStaffSearch(e.target.value); setSelectedStaffId(null); }} placeholder="Search by name, role, or ID..." style={{ fontSize: 12, paddingLeft: 28 }} />
                                                        </div>
                                                    </div>
                                                    <div style={{ minWidth: 110 }}>
                                                        <label className="label">Department</label>
                                                        <select className="input" value={staffDeptFilter} onChange={e => { setStaffDeptFilter(e.target.value); setSelectedStaffId(null); }} style={{ fontSize: 12 }}>
                                                            {staffDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Staff results */}
                                                <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {filteredStaff.length === 0 ? (
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No matching staff found</div>
                                                    ) : (
                                                        filteredStaff.map(s => {
                                                            const isChosen = selectedStaffId === s.id;
                                                            return (
                                                                <div
                                                                    key={s.id}
                                                                    onClick={() => { setSelectedStaffId(isChosen ? null : s.id); setMemberRole(s.job_title); }}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                                                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.12s',
                                                                        background: isChosen ? 'rgba(59,130,246,0.08)' : 'var(--surface-card)',
                                                                        border: isChosen ? '1px solid var(--helix-primary)' : '1px solid var(--border-subtle)',
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        width: 24, height: 24, borderRadius: '50%',
                                                                        background: isChosen ? 'var(--helix-primary)' : 'var(--surface-2)', color: isChosen ? '#fff' : 'var(--text-secondary)',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: 9, fontWeight: 700, flexShrink: 0,
                                                                    }}>
                                                                        {s.first_name[0]}{s.last_name[0]}
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.first_name} {s.last_name}</div>
                                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.job_title} · {s.dept} · {s.employee_id}</div>
                                                                    </div>
                                                                    {isChosen && <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--helix-primary)' }}>check_circle</span>}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {selectedStaff && (
                                                    <div>
                                                        <label className="label">Role in Team</label>
                                                        <select className="input" value={memberRole} onChange={e => setMemberRole(e.target.value)} style={{ fontSize: 12 }}>
                                                            {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                    </div>
                                                )}

                                                <button className="btn btn-primary btn-xs" style={{ alignSelf: 'flex-end', justifyContent: 'center' }} onClick={handleAddMember} disabled={!selectedStaff}>
                                                    <span className="material-icons-round" style={{ fontSize: 12 }}>person_add</span>
                                                    Add
                                                </button>
                                            </div>
                                        )}

                                        {selectedTeam.members.length === 0 ? (
                                            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                                                No members yet. Add the first member above.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {selectedTeam.members.map(member => (
                                                    <div key={member.id} style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '8px 10px', borderRadius: 'var(--radius-md)',
                                                        background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                width: 28, height: 28, borderRadius: '50%',
                                                                background: 'var(--helix-primary)', color: '#fff',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 10, fontWeight: 700, flexShrink: 0,
                                                            }}>
                                                                {member.firstName[0]}{member.lastName[0]}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 12, fontWeight: 600 }}>{member.firstName} {member.lastName}</div>
                                                                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                                                    {member.jobTitle}
                                                                    <span style={{ marginLeft: 8, color: statusColor[member.status], fontWeight: 600 }}>{member.status}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="btn btn-danger btn-xs"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            title="Remove member"
                                                        >
                                                            <span className="material-icons-round" style={{ fontSize: 12 }}>close</span>
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
