import { getProxyHeaders } from '@/lib/proxy-auth';
import { resolveFacilityId } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// GET /departments - List departments (requires facility_id query param)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const facilityId = searchParams.get('facility_id') || await resolveFacilityId(req, API_BASE_URL);

        const url = new URL(`${API_BASE_URL}/api/v1/departments`);
        if (facilityId) url.searchParams.set('facility_id', facilityId);

        console.log('Proxy list departments request to:', url.toString());

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: getProxyHeaders(req),
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

// POST /departments - Create a department
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const facilityId = body.facility_id || body.facilityId || await resolveFacilityId(req, API_BASE_URL);
        const payload = facilityId ? { ...body, facility_id: facilityId } : body;
        const url = `${API_BASE_URL}/api/v1/departments`;

        console.log('Proxy create department request to:', url);

        const res = await fetch(url, {
            method: 'POST',
            headers: getProxyHeaders(req),
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
