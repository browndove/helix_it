import { getProxyHeadersWithFacility } from '@/lib/proxy-auth';
import { resolveFacilityOrClientHint } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

type UpdateFolderBody = {
    name?: string;
    description?: string;
    facility_id?: string;
    facilityId?: string;
};

function clientFacilityHint(req: NextRequest, body?: Record<string, unknown>): string | null {
    const q = new URL(req.url).searchParams.get('facility_id');
    if (q?.trim()) return q.trim();
    if (!body) return null;
    const fromBody = String(body.facility_id || body.facilityId || '').trim();
    return fromBody || null;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientFacilityHint(req));
        if (!resolved.ok) return resolved.response;

        const url = new URL(`${API_BASE_URL}/api/v1/patient-folders/${id}`);
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
            return NextResponse.json({ error: 'Backend returned invalid response', details: text.substring(0, 200) }, { status: 502 });
        }
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json() as UpdateFolderBody;
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientFacilityHint(req, body as Record<string, unknown>));
        if (!resolved.ok) return resolved.response;

        const payload = {
            name: body.name?.trim(),
            description: body.description?.trim() || undefined,
            facility_id: resolved.facilityId,
            facilityId: resolved.facilityId,
            current_facility_id: resolved.facilityId,
        };

        const putUrl = new URL(`${API_BASE_URL}/api/v1/patient-folders/${id}`);
        putUrl.searchParams.set('facility_id', resolved.facilityId);

        const res = await fetch(putUrl.toString(), {
            method: 'PUT',
            headers: getProxyHeadersWithFacility(req, resolved.facilityId),
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            return NextResponse.json({ error: 'Backend returned invalid response', details: text.substring(0, 200) }, { status: 502 });
        }
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientFacilityHint(req));
        if (!resolved.ok) return resolved.response;

        const url = new URL(`${API_BASE_URL}/api/v1/patient-folders/${id}`);
        url.searchParams.set('facility_id', resolved.facilityId);

        const res = await fetch(url.toString(), {
            method: 'DELETE',
            headers: getProxyHeadersWithFacility(req, resolved.facilityId),
        });
        if (res.status === 204 || res.status === 205) {
            return new NextResponse(null, { status: res.status });
        }
        const text = await res.text();
        let data: unknown = {};
        if (text.trim()) {
            try {
                data = JSON.parse(text);
            } catch {
                return NextResponse.json({ error: 'Backend returned invalid response', details: text.substring(0, 200) }, { status: 502 });
            }
        }
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
