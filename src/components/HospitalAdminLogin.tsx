'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/config';

export default function HospitalAdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleLogin = async () => {
        setError('');
        if (!email || !password) {
            setError('Please enter your email and password.');
            showToast('Please enter your email and password.', 'error');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Login failed');
                showToast(data.message || 'Login failed', 'error');
                setLoading(false);
                return;
            }
            showToast('Login successful! Redirecting...', 'success');
            setTimeout(() => router.push('/dashboard'), 700);
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Network error. Please try again.';
            setError(errMsg);
            showToast(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-900)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>

            <div className="fade-in" style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 52, height: 52,
                        background: 'var(--helix-primary)',
                        borderRadius: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 2px 8px rgba(30,58,95,0.18)',
                    }}>
                        <span className="material-icons-round" style={{ fontSize: 26, color: '#fff' }}>local_hospital</span>
                    </div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                        Helix
                    </h1>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.02em' }}>Clinical Workflow OS</p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '32px 28px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
                }}>
                    <h2 style={{ fontSize: '1.3rem', marginBottom: 4 }}>Internal Admin Portal</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
                        Sign in as an internal administrator to access the facilities dashboard.
                    </p>

                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--critical-bg)', border: '1px solid rgba(140,90,94,0.2)', marginBottom: 16, fontSize: 13, color: 'var(--critical)', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label className="label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <span className="material-icons-round" style={{
                                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                    fontSize: 16, color: 'var(--text-muted)',
                                }}>mail</span>
                                <input
                                    id="email"
                                    className="input"
                                    type="email"
                                    placeholder="admin@accramedical.com.gh"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                    style={{ paddingLeft: 36 }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <span className="material-icons-round" style={{
                                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                    fontSize: 16, color: 'var(--text-muted)',
                                }}>lock</span>
                                <input
                                    id="password"
                                    className="input"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                    style={{ paddingLeft: 36, paddingRight: 42 }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    onClick={() => setShowPassword(prev => !prev)}
                                    style={{
                                        position: 'absolute',
                                        right: 10,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: 0,
                                    }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: 18 }}>
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 0', fontSize: 12 }}>
                                Recovery?
                            </button>
                        </div>

                        <button
                            id="sign-in-btn"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 4, opacity: loading ? 0.7 : 1 }}
                            onClick={handleLogin}
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                            {!loading && <span className="material-icons-round" style={{ fontSize: 16 }}>arrow_forward</span>}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
                    {[
                        { icon: 'help', label: 'Help Desk' },
                        { icon: 'policy', label: 'Privacy Policy' },
                    ].map(item => (
                        <button key={item.label} className="btn btn-ghost btn-xs" style={{ color: 'var(--text-muted)' }}>
                            <span className="material-icons-round" style={{ fontSize: 14 }}>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
                <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-disabled)', marginTop: 12 }}>
                    &copy; {new Date().getFullYear()} Blvcksapphire Company Ltd
                </p>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className="toast-enter" style={{
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    zIndex: 999,
                    background: 'var(--surface-card)',
                    border: `1px solid ${toast.type === 'error' ? 'var(--critical)' : 'var(--success)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: toast.type === 'error' ? 'var(--critical)' : 'var(--success)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <span className="material-icons-round" style={{ fontSize: 16 }}>
                        {toast.type === 'error' ? 'error' : 'check_circle'}
                    </span>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
