'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import { API_ENDPOINTS } from '@/lib/config';
import { FacilityViewProvider } from '@/contexts/FacilityViewContext';

export default function FacilityDashboardPage() {
    const params = useParams<{ facilityId: string }>();
    const router = useRouter();
    const facilityId = params.facilityId;

    const [hospital, setHospital] = useState<any | null>(null);
    const [hospitalName, setHospitalName] = useState('');
    const [hospitalAddress, setHospitalAddress] = useState('');
    const [hospitalPhone, setHospitalPhone] = useState('');
    const [hospitalEmail, setHospitalEmail] = useState('');
    const [toast, setToast] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [screenshotsAllowed, setScreenshotsAllowed] = useState(false);
    const [ipMode, setIpMode] = useState<'whitelist' | 'blacklist'>('whitelist');
    const [ipList, setIpList] = useState<string[]>([]);
    const [newIp, setNewIp] = useState('');
    const [retentionPeriod, setRetentionPeriod] = useState('90');
    const [settingsChanged, setSettingsChanged] = useState(false);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    };

    const fetchData = useCallback(async () => {
        const url = API_ENDPOINTS.FACILITY(facilityId as string);
        try {
            const hRes = await fetch(url);
            const status = hRes.status;
            if (hRes.ok) {
                const h = await hRes.json();
                setHospital(h);
                setHospitalName(h.name || '');
                setHospitalAddress(h.address || '');
                setHospitalPhone(h.phone || '');
                setHospitalEmail(h.email || '');
            } else {
                showToast('Failed to load facility details');
            }
        } catch {
            showToast('Failed to load data');
        }
        setLoading(false);
    }, [facilityId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const licenseExpiry = hospital?.license_expires_at ? new Date(hospital.license_expires_at) : new Date();
    const now = new Date();
    const daysLeft = Math.ceil((licenseExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const licenseActive = daysLeft > 0;
    const licenseWarning = daysLeft > 0 && daysLeft <= 90;

    const addIp = () => {
        const ip = newIp.trim();
        if (!ip || ipList.includes(ip)) return;
        setIpList(prev => [...prev, ip]);
        setNewIp('');
        setSettingsChanged(true);
    };

    const removeIp = (ip: string) => {
        setIpList(prev => prev.filter(i => i !== ip));
        setSettingsChanged(true);
    };

    const saveSettings = () => {
        setSettingsChanged(false);
        showToast('Settings saved successfully');
    };

    if (loading) {
        const shimmer = {
            background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--border-subtle) 50%, var(--surface-2) 75%)',
            backgroundSize: '400% 100%',
            animation: 'shimmer 1.4s ease infinite',
            borderRadius: 'var(--radius-md)',
        } as const;
        const line = (w: string, h = 12) => <div style={{ ...shimmer, width: w, height: h, marginBottom: 8 }} />;
        return (
            <div className="app-main">
                <TopBar title="Home" subtitle="Hospital Setup" />
                <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px', background: 'var(--bg-900)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div className="fade-in delay-1 card">
                                {line('160px', 16)}
                                <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                                    <div style={{ ...shimmer, width: 80, height: 80, borderRadius: 12, flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        {line('100%', 32)}
                                        {line('100%', 32)}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                                    <div style={{ ...shimmer, height: 32 }} />
                                    <div style={{ ...shimmer, height: 32 }} />
                                </div>
                            </div>
                            <div className="fade-in delay-2 card">
                                {line('140px', 16)}
                                <div style={{ ...shimmer, height: 70, marginTop: 10 }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                                    <div style={{ ...shimmer, height: 48 }} />
                                    <div style={{ ...shimmer, height: 48 }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <>
            {toast && (
                <div
                    className="toast-enter"
                    style={{
                        position: 'fixed',
                        top: 20,
                        right: 20,
                        zIndex: 999,
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 18px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <span
                        className="material-icons-round"
                        style={{ fontSize: 16, color: 'var(--success)' }}
                    >
                        check_circle
                    </span>
                    {toast}
                </div>
            )}

            <FacilityViewProvider value={{ facilityId: facilityId as string, facilityName: hospitalName || null }}>
                <div className="app-main">
                    <TopBar title="Home" subtitle={`Hospital Setup • Facility ${facilityId}`} />

                <main
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '24px 28px',
                        background: 'var(--bg-900)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 18,
                            maxWidth: 640,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 18,
                            }}
                        >
                            <div className="fade-in delay-1 card">
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                >
                                    <h3
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <span
                                            className="material-icons-round"
                                            style={{
                                                fontSize: 20,
                                                color: 'var(--helix-primary)',
                                            }}
                                        >
                                            business
                                        </span>
                                        Hospital Profile
                                    </h3>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => router.push('/dashboard')}
                                    >
                                        <span
                                            className="material-icons-round"
                                            style={{ fontSize: 14, marginRight: 4 }}
                                        >
                                            arrow_back
                                        </span>
                                        Back to Facilities
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
                                    <div
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 12,
                                            border: '2px dashed var(--border-default)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'default',
                                            background: 'var(--surface-2)',
                                            flexShrink: 0,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <span
                                            className="material-icons-round"
                                            style={{
                                                fontSize: 24,
                                                color: 'var(--text-disabled)',
                                            }}
                                        >
                                            add_photo_alternate
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 9,
                                                color: 'var(--text-muted)',
                                                marginTop: 2,
                                            }}
                                        >
                                            Logo
                                        </span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ marginBottom: 10 }}>
                                            <label className="label">Hospital Name</label>
                                            <input
                                                className="input"
                                                value={hospitalName}
                                                readOnly
                                                disabled
                                                style={{ fontSize: 13 }}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Address</label>
                                            <input
                                                className="input"
                                                value={hospitalAddress}
                                                readOnly
                                                disabled
                                                style={{ fontSize: 13 }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 12,
                                    }}
                                >
                                    <div>
                                        <label className="label">Phone</label>
                                        <input
                                            className="input"
                                            value={hospitalPhone}
                                            readOnly
                                            disabled
                                            style={{ fontSize: 13 }}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Email</label>
                                        <input
                                            className="input"
                                            value={hospitalEmail}
                                            readOnly
                                            disabled
                                            style={{ fontSize: 13 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="fade-in delay-2 card">
                                <h3
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 14,
                                    }}
                                >
                                    <span
                                        className="material-icons-round"
                                        style={{
                                            fontSize: 20,
                                            color: licenseWarning
                                                ? 'var(--warning)'
                                                : licenseActive
                                                ? 'var(--success)'
                                                : 'var(--critical)',
                                        }}
                                    >
                                        {licenseActive ? 'verified' : 'gpp_bad'}
                                    </span>
                                    License Status
                                </h3>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        padding: '14px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        background: licenseWarning
                                            ? 'var(--warning-bg)'
                                            : licenseActive
                                            ? 'var(--success-bg)'
                                            : 'var(--critical-bg)',
                                        border: `1px solid ${
                                            licenseWarning
                                                ? 'rgba(154,123,46,0.2)'
                                                : licenseActive
                                                ? '#d5e8dd'
                                                : 'rgba(140,90,94,0.2)'
                                        }`,
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 14,
                                                color: licenseActive
                                                    ? 'var(--text-primary)'
                                                    : 'var(--critical)',
                                            }}
                                        >
                                            {licenseActive ? 'Active License' : 'License Expired'}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: 'var(--text-muted)',
                                                marginTop: 3,
                                            }}
                                        >
                                            Expires:{' '}
                                            {licenseExpiry.toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </div>
                                        {licenseActive && (
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: licenseWarning
                                                        ? 'var(--warning)'
                                                        : 'var(--success)',
                                                    marginTop: 2,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {daysLeft} days remaining{' '}
                                                {licenseWarning ? '— Renewal recommended' : ''}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => showToast('Renewal request sent')}
                                    >
                                        <span
                                            className="material-icons-round"
                                            style={{ fontSize: 14 }}
                                        >
                                            autorenew
                                        </span>
                                        {licenseWarning || !licenseActive ? 'Renew Now' : 'Manage'}
                                    </button>
                                </div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 12,
                                        marginTop: 14,
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--surface-2)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: 'var(--text-muted)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            License Type
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                marginTop: 2,
                                            }}
                                        >
                                            {hospital?.license_type || 'Enterprise'}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--surface-2)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: 'var(--text-muted)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            Max Users
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                marginTop: 2,
                                            }}
                                        >
                                            {hospital?.max_users || 500}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="fade-in delay-2" style={{ marginTop: 20 }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <div>
                                <h3
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 2,
                                    }}
                                >
                                    <span
                                        className="material-icons-round"
                                        style={{ fontSize: 22, color: 'var(--helix-primary)' }}
                                    >
                                        admin_panel_settings
                                    </span>
                                    Hospital-Wide Settings
                                </h3>
                                <p
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                        margin: 0,
                                    }}
                                >
                                    Security, compliance, and messaging policies that apply across all
                                    departments
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
                </div>
            </FacilityViewProvider>
        </>
    );
}
