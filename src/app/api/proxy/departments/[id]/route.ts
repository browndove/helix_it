import { getProxyHeaders } from '@/lib/proxy-auth';
import { resolveFacilityId } from '@/lib/proxy-facility';
import { DEPARTMENT_DESCRIPTION_MAX_LENGTH, DEPARTMENT_NAME_MAX_LENGTH } from '@/lib/departmentName';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

async function resolveDepartmentRequestFacility(
    req: NextRequest,
    body?: Record<string, unknown>
): Promise<string | NextResponse> {
    const sessionFacilityId = await resolveFacilityId(req, API_BASE_URL);
    if (!sessionFacilityId) {
        return NextResponse.json(
            { error: 'Unable to resolve facility for current session. Please log in again.' },
            { status: 400 }
        );
    }
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('facility_id');
    const fromBody = body ? String(body.facility_id || body.facilityId || '').trim() : '';
    const requested = (q && q.trim()) || fromBody;
    if (requested && requested !== sessionFacilityId) {
        return NextResponse.json(
            { error: 'Facility mismatch. Departments are restricted to your logged-in facility.' },
            { status: 403 }
        );
    }
    return sessionFacilityId;
}

// GET /departments/{id} - Get a department
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const facilityResolved = await resolveDepartmentRequestFacility(req);
        if (facilityResolved instanceof NextResponse) return facilityResolved;

        const url = new URL(`${API_BASE_URL}/api/v1/departments/${id}`);
        url.searchParams.set('facility_id', facilityResolved);

        console.log('Proxy get department request to:', url.toString());

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

// PUT /departments/{id} - Update a department
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json() as Record<string, unknown>;
        if (typeof body.name === 'string' && body.name.trim().length > DEPARTMENT_NAME_MAX_LENGTH) {
            return NextResponse.json(
                { error: `Department name must be ${DEPARTMENT_NAME_MAX_LENGTH} characters or fewer` },
                { status: 400 }
            );
        }
        if (typeof body.description === 'string' && body.description.length > DEPARTMENT_DESCRIPTION_MAX_LENGTH) {
            return NextResponse.json(
                { error: `Description must be ${DEPARTMENT_DESCRIPTION_MAX_LENGTH} characters or fewer` },
                { status: 400 }
            );
        }
        const facilityResolved = await resolveDepartmentRequestFacility(req, body);
        if (facilityResolved instanceof NextResponse) return facilityResolved;
        const payload = { ...body, facility_id: facilityResolved };

        const url = `${API_BASE_URL}/api/v1/departments/${id}`;

        console.log('Proxy update department request to:', url);

        const res = await fetch(url, {
            method: 'PUT',
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

// DELETE /departments/{id} - Delete a department
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const facilityResolved = await resolveDepartmentRequestFacility(req);
        if (facilityResolved instanceof NextResponse) return facilityResolved;

        const url = new URL(`${API_BASE_URL}/api/v1/departments/${id}`);
        url.searchParams.set('facility_id', facilityResolved);

        console.log('Proxy delete department request to:', url.toString());

        const res = await fetch(url.toString(), {
            method: 'DELETE',
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
