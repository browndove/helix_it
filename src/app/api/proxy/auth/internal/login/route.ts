import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config';
import {
    extractAccessToken,
    extractExpiryRaw,
    shouldOfferOtpAfterPassword,
} from '@/lib/internal-auth-response';

const INTERNAL_LOGIN_PATH =
    process.env.NEXT_PUBLIC_AUTH_INTERNAL_LOGIN_PATH || '/api/v1/auth/internal/login';
const SESSION_COOKIE_NAME = 'helix-session';

export async function POST(req: NextRequest) {
    const url = `${API_BASE_URL}${INTERNAL_LOGIN_PATH}`;
    console.log('[proxy auth/internal/login] Forwarding to:', url);

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
            console.error('[proxy auth/internal/login] Non-JSON response', res.status);
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
                }
                response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);
                response.headers.set('X-Internal-Auth', 'complete');
            } else if (shouldOfferOtpAfterPassword(data, false)) {
                response.headers.set('X-Internal-Auth', 'otp_required');
            } else {
                response.headers.set('X-Internal-Auth', 'incomplete');
            }
        }

        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isTimeout = message.includes('abort') || message.includes('timeout');
        console.error('[proxy auth/internal/login]', message);
        return NextResponse.json(
            {
                error: isTimeout ? 'Backend request timed out' : 'Backend unreachable',
                details: message,
            },
            { status: 502 },
        );
    }
}
