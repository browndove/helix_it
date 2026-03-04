import { getTokenFromCookie } from '@/lib/proxy-auth';
import { decodeTokenClaims, getClaimBoolean } from '@/lib/token-claims';
import { NextRequest, NextResponse } from 'next/server';

// GET /auth/settings - Get auth/security settings for current user
export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromCookie(req);
        const claims = decodeTokenClaims(token);
        if (!token || !claims) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const data = {
            two_factor_enabled: getClaimBoolean(claims, ['two_factor_enabled', 'two_factor', 'twoFactorEnabled'], false),
            session_timeout_minutes: 30,
            source: 'token-fallback',
        };
        return NextResponse.json(data, { status: 200 });
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}

// PATCH /auth/settings - Update auth/security settings for current user
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const token = getTokenFromCookie(req);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Placeholder until backend settings endpoint path is confirmed.
        return NextResponse.json(
            { message: 'Settings update accepted', ...body, source: 'proxy-placeholder' },
            { status: 200 }
        );
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
