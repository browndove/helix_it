import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config';
import { extractAccessToken, extractExpiryRaw } from '@/lib/internal-auth-response';

const INTERNAL_VERIFY_OTP_PATH =
    process.env.NEXT_PUBLIC_AUTH_INTERNAL_VERIFY_OTP_PATH || '/api/v1/auth/internal/verify-otp';
const SESSION_COOKIE_NAME = 'helix-session';

function extractFacilityIdFromPayload(payload: unknown): string {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
    const root = payload as Record<string, unknown>;

    const candidates: unknown[] = [
        root.facility_id,
        root.facilityId,
        root.current_facility_id,
        root.currentFacilityId,
        root.user,
        root.staff,
        root.admin,
        root.data,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
        const obj = candidate as Record<string, unknown>;
        const nestedId = String(
            obj.facility_id
            || obj.facilityId
            || obj.current_facility_id
            || obj.currentFacilityId
            || (obj.facility && typeof obj.facility === 'object'
                ? (obj.facility as Record<string, unknown>).id || (obj.facility as Record<string, unknown>).facility_id
                : '')
            || ''
        ).trim();
        if (nestedId) return nestedId;
    }

    return '';
}

export async function POST(req: NextRequest) {
    const url = `${API_BASE_URL}${INTERNAL_VERIFY_OTP_PATH}`;
    console.log('[proxy auth/internal/verify-otp] Forwarding to:', url);

    try {
        const body = await req.json();

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        });

        const text = await res.text();
        let data: unknown;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            console.error('[proxy auth/internal/verify-otp] Non-JSON response', res.status);
            return NextResponse.json(
                { error: 'Backend returned invalid response', details: text.substring(0, 200) },
                { status: 502 },
            );
        }

        const response = NextResponse.json(data, { status: res.status });

        if (res.ok) {
            const token = extractAccessToken(data);
            if (token) {
                const expiresAtRaw = extractExpiryRaw(data);
                const cookieOptions: Parameters<typeof response.cookies.set>[2] = {
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                };
                if (process.env.NODE_ENV === 'production') {
                    cookieOptions.secure = true;
                }
                if (expiresAtRaw) {
                    const expires = new Date(expiresAtRaw);
                    if (!Number.isNaN(expires.getTime())) {
                        cookieOptions.expires = expires;
                    }
                } else {
                    cookieOptions.maxAge = 60 * 60 * 8;
                }
                response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);
                response.headers.set('X-Internal-Auth', 'complete');
            } else {
                response.headers.set('X-Internal-Auth', 'incomplete');
            }

            const facilityId = extractFacilityIdFromPayload(data);
            if (facilityId) {
                response.cookies.set('helix-facility', facilityId, {
                    httpOnly: false,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 60 * 60 * 8,
                });
            } else {
                response.cookies.delete('helix-facility');
            }
        }

        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[proxy auth/internal/verify-otp]', message);
        return NextResponse.json(
            { error: 'Proxy error', details: message },
            { status: 500 },
        );
    }
}
