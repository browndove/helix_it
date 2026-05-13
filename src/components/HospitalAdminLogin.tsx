'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/config';
import { extractAccessToken, shouldOfferOtpAfterPassword } from '@/lib/internal-auth-response';

export default function HospitalAdminLogin() {
    const router = useRouter();
    const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const otp = otpDigits.join('');

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (step === 'otp') {
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        }
    }, [step]);

    const handleOtpChange = useCallback((index: number, value: string) => {
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, 6).split('');
            const next = [...otpDigits];
            digits.forEach((d, i) => {
                if (index + i < 6) next[index + i] = d;
            });
            setOtpDigits(next);
            otpRefs.current[Math.min(index + digits.length, 5)]?.focus();
            return;
        }
        const digit = value.replace(/\D/g, '');
        const next = [...otpDigits];
        next[index] = digit;
        setOtpDigits(next);
        if (digit && index < 5) otpRefs.current[index + 1]?.focus();
    }, [otpDigits]);

    const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            const next = [...otpDigits];
            next[index - 1] = '';
            setOtpDigits(next);
            otpRefs.current[index - 1]?.focus();
        }
    }, [otpDigits]);

    const goToDashboard = () => {
        showToast('Signed in', 'success');
        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                window.location.assign('/dashboard');
            }, 400);
        } else {
            setTimeout(() => router.push('/dashboard'), 400);
        }
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
            const res = await fetch(API_ENDPOINTS.INTERNAL_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });
            const authPhase = res.headers.get('x-internal-auth');
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError((data as { message?: string }).message || 'Login failed');
                showToast((data as { message?: string }).message || 'Login failed', 'error');
                setLoading(false);
                return;
            }
            if (authPhase === 'complete') {
                goToDashboard();
                setLoading(false);
                return;
            }
            const hasTokenInBody = !!extractAccessToken(data);
            const offerOtp =
                !hasTokenInBody
                && (authPhase === 'otp_required'
                    || ((authPhase === 'incomplete' || authPhase === null || authPhase === '') &&
                        shouldOfferOtpAfterPassword(data, false)));
            if (offerOtp) {
                setStep('otp');
                setOtpDigits(['', '', '', '', '', '']);
                setError('');
                showToast('Enter the code sent to your email', 'success');
                setLoading(false);
                return;
            }
            const msg =
                (data as { message?: string }).message
                || 'Login did not return a session token. Check API response.';
            setError(msg);
            showToast(msg, 'error');
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Network error. Please try again.';
            setError(errMsg);
            showToast(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        const code = otpDigits.join('');
        if (!code || code.length !== 6) {
            setError('Please enter the 6-digit code.');
            showToast('Please enter the 6-digit code.', 'error');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.INTERNAL_VERIFY_OTP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, otp: code }),
            });
            const authPhase = res.headers.get('x-internal-auth');
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError((data as { message?: string }).message || 'Invalid or expired code');
                showToast((data as { message?: string }).message || 'Invalid or expired code', 'error');
                setLoading(false);
                return;
            }
            if (authPhase !== 'complete') {
                const msg =
                    (data as { message?: string }).message
                    || 'Verification did not return a session. Check the API response.';
                setError(msg);
                showToast(msg, 'error');
                setLoading(false);
                return;
            }
            goToDashboard();
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Network error. Please try again.';
            setError(errMsg);
            showToast(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(API_ENDPOINTS.INTERNAL_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setOtpDigits(['', '', '', '', '', '']);
                showToast('A new code was sent if your account is eligible.', 'success');
            } else {
                showToast((data as { message?: string }).message || 'Could not resend code', 'error');
            }
        } catch {
            showToast('Network error', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep('credentials');
        setOtpDigits(['', '', '', '', '', '']);
        setError('');
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

                <div style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '32px 28px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
                }}>
                    {step === 'credentials' ? (
                        <>
                            <h2 style={{ fontSize: '1.3rem', marginBottom: 4 }}>Internal Admin Portal</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
                                Sign in with your email and password. You may be asked for a one-time code sent to your email.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '1.3rem', marginBottom: 4 }}>Enter verification code</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                                Check <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> for a 6-digit code, then enter it below.
                            </p>
                        </>
                    )}

                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--critical-bg)', border: '1px solid rgba(140,90,94,0.2)', marginBottom: 16, fontSize: 13, color: 'var(--critical)', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    {step === 'credentials' ? (
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
                                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 0', fontSize: 12 }}>
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
                                {loading ? 'Signing in...' : 'Continue'}
                                {!loading && <span className="material-icons-round" style={{ fontSize: 16 }}>arrow_forward</span>}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                {otpDigits.map((d, i) => (
                                    <input
                                        key={i}
                                        ref={el => { otpRefs.current[i] = el; }}
                                        className="input"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={1}
                                        value={d}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        style={{
                                            width: 48,
                                            height: 48,
                                            textAlign: 'center',
                                            fontSize: 18,
                                            fontWeight: 700,
                                            padding: 0,
                                        }}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, opacity: loading ? 0.7 : 1 }}
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.length !== 6}
                            >
                                {loading ? 'Verifying...' : 'Verify & sign in'}
                            </button>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={handleBack} disabled={loading}>
                                    ← Back
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={handleResendCode} disabled={loading}>
                                    Resend code
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
                    {[
                        { icon: 'help', label: 'Help Desk' },
                        { icon: 'policy', label: 'Privacy Policy' },
                    ].map(item => (
                        <button key={item.label} type="button" className="btn btn-ghost btn-xs" style={{ color: 'var(--text-muted)' }}>
                            <span className="material-icons-round" style={{ fontSize: 14 }}>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
                <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-disabled)', marginTop: 12 }}>
                    &copy; {new Date().getFullYear()} Blvcksapphire Company Ltd
                </p>
            </div>

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
