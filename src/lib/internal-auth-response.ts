/**
 * Shared parsing for internal admin login / verify-otp JSON responses.
 */

function looksLikeJwt(s: string): boolean {
    const p = s.trim().split('.');
    return p.length === 3 && p.every(part => part.length > 0) && s.length > 40;
}

function extractJwtShapedValue(o: Record<string, unknown>): string | undefined {
    for (const v of Object.values(o)) {
        if (typeof v !== 'string') continue;
        const t = v.trim();
        if (looksLikeJwt(t)) return t;
    }
    return undefined;
}

export function extractAccessToken(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
    const tryObj = (o: Record<string, unknown>): string | undefined => {
        const keys = [
            'access_token',
            'accessToken',
            'token',
            'jwt',
            'session_token',
            'sessionToken',
            'bearer_token',
            'id_token',
        ];
        for (const k of keys) {
            const v = o[k];
            if (typeof v !== 'string' || !v.trim()) continue;
            const t = v.trim();
            if (k === 'id_token' && !looksLikeJwt(t)) continue;
            return t;
        }
        const auth = o.auth;
        if (auth && typeof auth === 'object' && !Array.isArray(auth)) {
            const t = tryObj(auth as Record<string, unknown>);
            if (t) return t;
        }
        const tokens = o.tokens;
        if (tokens && typeof tokens === 'object' && !Array.isArray(tokens)) {
            const t = tryObj(tokens as Record<string, unknown>);
            if (t) return t;
        }
        return undefined;
    };

    const root = payload as Record<string, unknown>;
    const top = tryObj(root);
    if (top) return top;

    const nested = root.data ?? root.result ?? root.payload ?? root.session;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const n = nested as Record<string, unknown>;
        const t = tryObj(n);
        if (t) return t;
        const inner = n.data ?? n.result;
        if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
            const t2 = tryObj(inner as Record<string, unknown>);
            if (t2) return t2;
        }
        const tokBag = n.tokens;
        if (tokBag && typeof tokBag === 'object' && !Array.isArray(tokBag)) {
            const t3 = tryObj(tokBag as Record<string, unknown>);
            if (t3) return t3;
        }
    }

    const jwtRoot = extractJwtShapedValue(root);
    if (jwtRoot) return jwtRoot;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const jl = extractJwtShapedValue(nested as Record<string, unknown>);
        if (jl) return jl;
    }
    return undefined;
}

export function extractExpiryRaw(data: unknown): string | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const o = data as Record<string, unknown>;
    const top =
        (typeof o.expired_at === 'string' && o.expired_at) ||
        (typeof o.expires_at === 'string' && o.expires_at) ||
        undefined;
    if (top) return top;
    const nested = o.data ?? o.result ?? o.payload;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const n = nested as Record<string, unknown>;
        return (
            (typeof n.expired_at === 'string' && n.expired_at) ||
            (typeof n.expires_at === 'string' && n.expires_at) ||
            undefined
        );
    }
    return undefined;
}

export function truthyFlag(v: unknown): boolean {
    return v === true || v === 'true' || v === 1 || v === '1';
}

function isOtpInterimResponse(data: unknown): boolean {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const o = data as Record<string, unknown>;
    if (truthyFlag(o.otp_sent)) return true;
    if (truthyFlag(o.requires_otp)) return true;
    if (truthyFlag(o.otp_required)) return true;
    const ns = String(o.next_step ?? o.nextStep ?? '').toLowerCase();
    if (
        ns.includes('verify_otp')
        || ns.includes('email_otp')
        || ns === 'otp'
        || ns === 'otp_verification'
    ) {
        return true;
    }
    const phase = String(o.phase ?? o.step ?? '').toLowerCase();
    return phase === 'otp' || phase === 'verify_otp' || phase === 'email_otp';
}

/** Concatenate common API message fields (including one level under `data`). */
function collectUserFacingStrings(data: unknown): string {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
    const o = data as Record<string, unknown>;
    const parts: string[] = [];
    for (const k of ['message', 'detail', 'error', 'info', 'description', 'title']) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) parts.push(v);
    }
    const nested = o.data ?? o.result ?? o.payload;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const n = nested as Record<string, unknown>;
        for (const k of ['message', 'detail', 'error', 'info', 'description']) {
            const v = n[k];
            if (typeof v === 'string' && v.trim()) parts.push(v);
        }
    }
    return parts.join('\n');
}

function suggestsOtpFromCopy(data: unknown): boolean {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const o = data as Record<string, unknown>;
    const m = collectUserFacingStrings(data).toLowerCase();
    if (!m) return false;
    // Helix-style copy: "An OTP has been sent to your email. Please check and enter it..."
    if (
        /otp\s+(has\s+been\s+)?sent/.test(m)
        || /sent\s+to\s+your\s+email/.test(m)
        || /sent\s+to\s+the\s+email/.test(m)
        || /enter\s+(the\s+)?(code|otp)\b/.test(m)
        || /complete\s+internal\s+admin/.test(m)
        || /one[-\s]?time\s+(code|otp|pin)/.test(m)
        || /verification code/.test(m)
        || /enter the code/.test(m)
        || /code was sent/.test(m)
        || /check your email/.test(m)
        || /6[\s-]?digit/.test(m)
        || /six[\s-]?digit/.test(m)
        || /email\s+otp/.test(m)
        || /enter\s+otp/.test(m)
    ) {
        return true;
    }
    const st = String(o.status ?? '').toLowerCase();
    return /pending_verification|otp_required|mfa_required|awaiting_otp/.test(st);
}

/** After password login: show OTP step when there is no token but API hints at a code step. */
export function shouldOfferOtpAfterPassword(data: unknown, hasToken: boolean): boolean {
    if (hasToken) return false;
    return isOtpInterimResponse(data) || suggestsOtpFromCopy(data);
}
