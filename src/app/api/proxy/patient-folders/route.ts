import { getProxyHeadersWithFacility } from '@/lib/proxy-auth';
import { resolveFacilityOrClientHint } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

type CreateFolderBody = {
    facility_id?: string;
    facilityId?: string;
    name?: string;
    description?: string;
    visibility?: 'public' | 'private';
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const url = new URL(`${API_BASE_URL}/api/v1/patient-folders`);

        const clientHint = searchParams.get('facility_id');
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientHint);
        if (!resolved.ok) return resolved.response;

        url.searchParams.set('facility_id', resolved.facilityId);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: getProxyHeadersWithFacility(req, resolved.facilityId),
        });
        const text = await res.text();
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            return NextResponse.json(
                { error: 'Backend returned invalid response', details: text.substring(0, 200) },
                { status: 502 }
            );
        }
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const incomingUrl = new URL(req.url);
        const queryFid = incomingUrl.searchParams.get('facility_id');
        const body = await req.json() as CreateFolderBody;
        const clientHint = body.facility_id || body.facilityId || queryFid;
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientHint);
        if (!resolved.ok) return resolved.response;

        const { facilityId } = resolved;

        const payload = {
            facility_id: facilityId,
            facilityId: facilityId,
            current_facility_id: facilityId,
            name: (body.name || '').trim(),
            description: (body.description || '').trim() || undefined,
            visibility: 'public' as const,
        };

        const url = new URL(`${API_BASE_URL}/api/v1/patient-folders`);
        url.searchParams.set('facility_id', facilityId);

        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: getProxyHeadersWithFacility(req, facilityId),
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            return NextResponse.json(
                { error: 'Backend returned invalid response', details: text.substring(0, 200) },
                { status: 502 }
            );
        }
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
