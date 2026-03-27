import { getProxyHeaders } from '@/lib/proxy-auth';
import { resolveFacilityId } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// GET /patients/care-summary — Dashboard counts per unit and provider team
export async function GET(req: NextRequest) {
    try {
        const url = new URL(`${API_BASE_URL}/api/v1/patients/care-summary`);

        const sessionFacilityId = await resolveFacilityId(req, API_BASE_URL);
        if (!sessionFacilityId) {
            return NextResponse.json({ error: 'Unable to resolve facility for current session.' }, { status: 400 });
        }
        url.searchParams.set('facility_id', sessionFacilityId);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: getProxyHeaders(req),
        });

        const text = await res.text();
        let data: unknown;
        try { data = JSON.parse(text); } catch {
            return NextResponse.json({ error: 'Backend returned invalid response', details: text.substring(0, 200) }, { status: 502 });
        }
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
