import { getProxyHeaders } from '@/lib/proxy-auth';
import { resolveFacilityId } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// GET /patients/search — Full search by IDs or query with filters
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const url = new URL(`${API_BASE_URL}/api/v1/patients/search`);

        const sessionFacilityId = await resolveFacilityId(req, API_BASE_URL);
        if (!sessionFacilityId) {
            return NextResponse.json({ error: 'Unable to resolve facility for current session.' }, { status: 400 });
        }
        url.searchParams.set('facility_id', sessionFacilityId);

        const forwardParams = [
            'patient_ids', 'q', 'directory_scope', 'department_id', 'unit_id',
            'provider_team_id', 'status', 'room', 'bed', 'medical_record_number',
            'page_id', 'page_size',
        ];
        forwardParams.forEach((param) => {
            const value = searchParams.get(param);
            if (value) url.searchParams.set(param, value);
        });

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
