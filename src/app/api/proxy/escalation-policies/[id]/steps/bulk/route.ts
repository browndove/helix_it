import { getProxyHeaders } from '@/lib/proxy-auth';
import { resolveFacilityId } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// POST /escalation-policies/{id}/steps/bulk - Bulk add steps
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const facilityId = searchParams.get('facility_id') || await resolveFacilityId(req, API_BASE_URL);

        const body = await req.json();
        const payload = {
            ...body,
            ...(facilityId ? { facility_id: facilityId } : {}),
        };

        const url = `${API_BASE_URL}/api/v1/escalation-policies/${id}/steps/bulk`;

        console.log('[bulkSteps] Payload:', JSON.stringify(payload));
        console.log('[bulkSteps] Request to:', url);


        const res = await fetch(url, {
            method: 'POST',
            headers: getProxyHeaders(req),
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        console.log('[bulkSteps] Response status:', res.status);
        if (!res.ok) console.log('[bulkSteps] Error body:', text.substring(0, 500));

        let data;
        try { data = JSON.parse(text); } catch {
            return NextResponse.json({ error: 'Backend returned invalid response', details: text.substring(0, 200) }, { status: 502 });
        }
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error('Proxy error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
