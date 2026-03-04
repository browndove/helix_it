import { getTokenFromCookie } from '@/lib/proxy-auth';
import { decodeTokenClaims, getClaimString } from '@/lib/token-claims';
import { NextRequest, NextResponse } from 'next/server';

// GET /auth/user - derive current admin details directly from JWT claims
export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromCookie(req);
        const claims = decodeTokenClaims(token);
        if (!token || !claims) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const firstName = getClaimString(claims, ['first_name', 'given_name']);
        const lastName = getClaimString(claims, ['last_name', 'family_name']);
        const fallbackName = `${firstName} ${lastName}`.trim();

        const data = {
            id: getClaimString(claims, ['user_id', 'sub', 'id']),
            first_name: firstName,
            last_name: lastName,
            name: getClaimString(claims, ['name'], fallbackName),
            email: getClaimString(claims, ['email', 'username']),
            phone: getClaimString(claims, ['phone']),
            job_title: getClaimString(claims, ['job_title', 'title']),
            role: getClaimString(claims, ['role', 'system_role', 'user_role'], 'admin'),
            facility_id: getClaimString(claims, ['facility_id', 'hospital_id']),
            claims,
        };

        return NextResponse.json(data, { status: 200 });
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
