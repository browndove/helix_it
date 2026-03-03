import { NextRequest } from 'next/server';

const COOKIE_NAME = 'helix-session';

/**
 * Extracts the backend access token from the session cookie
 * and returns headers with Authorization for proxying to the backend.
 */
export function getProxyHeaders(req: NextRequest): HeadersInit {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Gets just the token string from the cookie.
 */
export function getTokenFromCookie(req: NextRequest): string | undefined {
    return req.cookies.get(COOKIE_NAME)?.value;
}
