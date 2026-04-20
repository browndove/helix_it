import { getProxyHeadersWithFacility } from '@/lib/proxy-auth';
import { resolveFacilityOrClientHint } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

function clientFacilityHint(req: NextRequest, body?: Record<string, unknown>): string | null {
    const q = new URL(req.url).searchParams.get('facility_id');
    if (q?.trim()) return q.trim();
    if (!body) return null;
    const fromBody = String(body.facility_id || body.facilityId || '').trim();
    return fromBody || null;
}

// GET /staff/{id} - Get a staff member
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientFacilityHint(req));
        if (!resolved.ok) return resolved.response;

        const url = new URL(`${API_BASE_URL}/api/v1/staff/${id}`);
        url.searchParams.set('facility_id', resolved.facilityId);

        console.log('Proxy get staff member request to:', url.toString());

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: getProxyHeadersWithFacility(req, resolved.facilityId),
        });

        const text = await res.text();
        console.log('Backend response status:', res.status);

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.error('Failed to parse backend response as JSON');
            return NextResponse.json(
                { error: 'Backend returned invalid response', details: text.substring(0, 200) },
                { status: 502 }
            );
        }

        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}

// PUT /staff/{id} - Update a staff member
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = (await req.json()) as Record<string, unknown>;
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientFacilityHint(req, body));
        if (!resolved.ok) return resolved.response;

        const url = new URL(`${API_BASE_URL}/api/v1/staff/${id}`);
        url.searchParams.set('facility_id', resolved.facilityId);

        const payload = {
            ...body,
            facility_id: resolved.facilityId,
            facilityId: resolved.facilityId,
            current_facility_id: resolved.facilityId,
        };

        console.log('Proxy update staff member request to:', url.toString());

        const res = await fetch(url.toString(), {
            method: 'PUT',
            headers: getProxyHeadersWithFacility(req, resolved.facilityId),
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        console.log('Backend response status:', res.status);

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.error('Failed to parse backend response as JSON');
            return NextResponse.json(
                { error: 'Backend returned invalid response', details: text.substring(0, 200) },
                { status: 502 }
            );
        }

        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}

// DELETE /staff/{id} - Delete a staff member
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientFacilityHint(req));
        if (!resolved.ok) return resolved.response;

        const url = new URL(`${API_BASE_URL}/api/v1/staff/${id}`);
        url.searchParams.set('facility_id', resolved.facilityId);

        console.log('Proxy delete staff member request to:', url.toString());

        const res = await fetch(url.toString(), {
            method: 'DELETE',
            headers: getProxyHeadersWithFacility(req, resolved.facilityId),
        });

        const text = await res.text();
        console.log('Backend response status:', res.status);

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.error('Failed to parse backend response as JSON');
            return NextResponse.json(
                { error: 'Backend returned invalid response', details: text.substring(0, 200) },
                { status: 502 }
            );
        }

        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
