import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const AUTH_LOGIN_PATH = process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH || '/api/v1/auth/login';
const SESSION_COOKIE_NAME = 'helix-session';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const url = `${API_BASE_URL}${AUTH_LOGIN_PATH}`;

        console.log('Proxy login request to:', url);

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const text = await res.text();
        console.log('Backend response status:', res.status);
        console.log('Backend response text:', text.substring(0, 500));

        let data: any;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            console.error('Failed to parse backend response as JSON');
            return NextResponse.json(
                { error: 'Backend returned invalid response', details: text.substring(0, 200) },
                { status: 502 },
            );
        }

        const response = NextResponse.json(data, { status: res.status });

        // On successful login, persist the backend access token into our session cookie
        if (res.ok && data && typeof data === 'object' && typeof data.access_token === 'string') {
            const token: string = data.access_token;
            const expiresAtRaw: string | undefined =
                (data.expired_at && typeof data.expired_at === 'string' && data.expired_at) ||
                (data.expires_at && typeof data.expires_at === 'string' && data.expires_at);

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
        }

        return response;
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
