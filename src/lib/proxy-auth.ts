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
 * Same as getProxyHeaders plus X-Facility-Id for upstream routes that require
 * explicit facility scope for internal-admin tokens.
 */
export function getProxyHeadersWithFacility(req: NextRequest, facilityId?: string): Record<string, string> {
    const base = { ...(getProxyHeaders(req) as Record<string, string>) };
    const fid = facilityId?.trim();
    if (fid) {
        base['X-Facility-Id'] = fid;
    }
    return base;
}

/**
 * Gets just the token string from the cookie.
 */
export function getTokenFromCookie(req: NextRequest): string | undefined {
    return req.cookies.get(COOKIE_NAME)?.value;
}
