import { getProxyHeadersWithFacility } from '@/lib/proxy-auth';
import { resolveFacilityOrClientHint } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

type AddPatientBody = {
    patient_ids?: string[];
    patient_id?: string;
    facility_id?: string;
    facilityId?: string;
};

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json() as AddPatientBody;
        const queryFid = new URL(req.url).searchParams.get('facility_id');
        const clientHint = body.facility_id || body.facilityId || queryFid;
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, clientHint);
        if (!resolved.ok) return resolved.response;

        const payload = {
            patient_ids: Array.isArray(body.patient_ids)
                ? body.patient_ids
                : (body.patient_id ? [body.patient_id] : []),
            facility_id: resolved.facilityId,
            facilityId: resolved.facilityId,
            current_facility_id: resolved.facilityId,
        };

        const url = new URL(`${API_BASE_URL}/api/v1/patient-folders/${id}/patients`);
        url.searchParams.set('facility_id', resolved.facilityId);

        const res = await fetch(url.toString(), {
            method: 'POST',
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
