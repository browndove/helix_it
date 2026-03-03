import { getProxyHeaders } from '@/lib/proxy-auth';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// GET /hospital - Get hospital/facility info
export async function GET(req: NextRequest) {
    try {
        const url = `${API_BASE_URL}/api/v1/facilities`;

        console.log('Proxy get hospital request to:', url);

        const res = await fetch(url, {
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

        // If backend returns an array of facilities, return the first one as the hospital
        const hospital = Array.isArray(data) ? data[0] || null : data;
        return NextResponse.json(hospital, { status: res.status });
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}

// PUT /hospital - Update hospital/facility info
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        // If we have a facility ID, use it; otherwise update first facility
        const facilityId = body.id || body.facility_id;
        const url = facilityId
            ? `${API_BASE_URL}/api/v1/facilities/${facilityId}`
            : `${API_BASE_URL}/api/v1/facilities`;

        console.log('Proxy update hospital request to:', url);

        const res = await fetch(url, {
            method: 'PUT',
            headers: getProxyHeaders(req),
            body: JSON.stringify(body),
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
