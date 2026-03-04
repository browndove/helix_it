export type TokenClaims = Record<string, unknown>;

function base64UrlToUtf8(value: string): string {
    try {
        return Buffer.from(value, 'base64url').toString('utf8');
    } catch {
        const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        return Buffer.from(padded, 'base64').toString('utf8');
    }
}

export function decodeTokenClaims(token?: string): TokenClaims | null {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    try {
        const payload = base64UrlToUtf8(parts[1]);
        const parsed = JSON.parse(payload);
        return (parsed && typeof parsed === 'object') ? parsed as TokenClaims : null;
    } catch {
        return null;
    }
}

export function getClaimString(claims: TokenClaims | null, keys: string[], fallback = ''): string {
    if (!claims) return fallback;
    for (const key of keys) {
        const v = claims[key];
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return fallback;
}

export function getClaimBoolean(claims: TokenClaims | null, keys: string[], fallback = false): boolean {
    if (!claims) return fallback;
    for (const key of keys) {
        const v = claims[key];
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') {
            if (v.toLowerCase() === 'true') return true;
            if (v.toLowerCase() === 'false') return false;
        }
        if (typeof v === 'number') return v !== 0;
    }
    return fallback;
}
