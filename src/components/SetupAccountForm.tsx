'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/config';

export default function SetupAccountForm({ token }: { token: string }) {
    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async () => {
        setError('');
        setSuccess('');

        if (!token) {
            setError('Missing setup token. Use the full link from your email.');
            return;
        }
        if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password.trim()) {
            setError('Please fill all required fields.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.SETUP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    phone: phone.trim(),
                    password,
                    token,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = data?.message || data?.detail || 'Account setup failed';
                setError(msg);
                setLoading(false);
                return;
            }

            setSuccess(data?.message || 'Account activated successfully');
            setTimeout(() => router.push('/'), 1200);
        } catch {
            setError('Network error. Please try again.');
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
            padding: '24px 16px',
        }}>
            <div style={{ width: '100%', maxWidth: 460 }}>
                <div style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '28px 24px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 18 }}>
                        <h1 style={{ fontSize: 24, marginBottom: 6 }}>Set Up Account</h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Complete your Helix account setup to sign in.
                        </p>
                    </div>

                    {!token && (
                        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--critical-bg)', border: '1px solid rgba(140,90,94,0.2)', marginBottom: 12, fontSize: 12.5, color: 'var(--critical)' }}>
                            Setup token is missing from URL.
                        </div>
                    )}
                    {error && (
                        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--critical-bg)', border: '1px solid rgba(140,90,94,0.2)', marginBottom: 12, fontSize: 12.5, color: 'var(--critical)' }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid rgba(46,125,50,0.2)', marginBottom: 12, fontSize: 12.5, color: 'var(--success)' }}>
                            {success}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label className="label">First Name *</label>
                            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Kwame" />
                        </div>
                        <div>
                            <label className="label">Last Name *</label>
                            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Mensah" />
                        </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <label className="label">Phone *</label>
                        <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+233201234567" />
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <label className="label">Password *</label>
                        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <label className="label">Confirm Password *</label>
                        <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                        onClick={handleSubmit}
                        disabled={loading || !token}
                    >
                        {loading ? 'Setting up...' : 'Set up account'}
                    </button>

                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
                        Link expires in 48 hours.
                    </p>
                </div>
            </div>
        </div>
    );
}
