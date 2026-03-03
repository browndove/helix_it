'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';

interface UserProfileMenuProps {
    userName?: string;
    onLogoutComplete?: () => void;
    onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function UserProfileMenu({ userName = 'Admin', onLogoutComplete, onToast }: UserProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { logout } = useAuth();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const success = await logout(onToast);
        if (success) {
            onLogoutComplete?.();
        }
        setIsLoggingOut(false);
        setIsOpen(false);
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Profile Button */}
            <button
                className="btn btn-ghost btn-sm"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                }}
            >
                <div
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--helix-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                    }}
                >
                    {userName.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {userName}
                </span>
                <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--text-muted)' }}>
                    expand_more
                </span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 4,
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 999,
                        minWidth: 180,
                        overflow: 'hidden',
                    }}
                >
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 13,
                            color: 'var(--text-primary)',
                            borderBottom: '1px solid var(--border-default)',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <span className="material-icons-round" style={{ fontSize: 16 }}>account_circle</span>
                        Profile
                    </button>

                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 13,
                            color: 'var(--text-primary)',
                            borderBottom: '1px solid var(--border-default)',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <span className="material-icons-round" style={{ fontSize: 16 }}>lock</span>
                        Change Password
                    </button>

                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            color: 'var(--critical)',
                            opacity: isLoggingOut ? 0.6 : 1,
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => !isLoggingOut && (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <span className="material-icons-round" style={{ fontSize: 16 }}>logout</span>
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 998,
                    }}
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
