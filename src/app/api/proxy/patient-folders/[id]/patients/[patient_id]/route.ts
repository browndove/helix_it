import { getProxyHeadersWithFacility } from '@/lib/proxy-auth';
import { resolveFacilityOrClientHint } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; patient_id: string }> }
) {
    try {
        const { id, patient_id } = await params;
        const queryFid = new URL(req.url).searchParams.get('facility_id');
        const resolved = await resolveFacilityOrClientHint(req, API_BASE_URL, queryFid);
        if (!resolved.ok) return resolved.response;

        const url = new URL(`${API_BASE_URL}/api/v1/patient-folders/${id}/patients/${patient_id}`);
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
