import { NextRequest } from 'next/server';
import { getTokenFromCookie } from '@/lib/proxy-auth';

type FacilityLike = {
    id?: string;
    facility_id?: string;
};

function extractFacilityId(data: unknown): string | undefined {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const wrapped = data as { items?: unknown; data?: unknown; facilities?: unknown; results?: unknown };
        const nested = wrapped.items || wrapped.data || wrapped.facilities || wrapped.results;
        if (nested !== undefined) return extractFacilityId(nested);
    }

    if (Array.isArray(data)) {
        const first = data[0] as FacilityLike | undefined;
        return first?.id || first?.facility_id;
    }
    if (data && typeof data === 'object') {
        const single = data as FacilityLike;
        return single.id || single.facility_id;
    }
    return undefined;
}

/**
 * Best-effort helper that resolves facility_id from the authenticated user context.
 * Returns undefined if not resolvable; callers should decide fallback behavior.
 */
export async function resolveFacilityId(req: NextRequest, apiBaseUrl: string): Promise<string | undefined> {
    const token = getTokenFromCookie(req);
    if (!token) return undefined;

    try {
        const res = await fetch(`${apiBaseUrl}/api/v1/facilities`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!res.ok) return undefined;
        const data = await res.json();
        return extractFacilityId(data);
    } catch {
        return undefined;
    }
}
