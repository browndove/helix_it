import { getProxyHeaders } from '@/lib/proxy-auth';
import { resolveFacilityId } from '@/lib/proxy-facility';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

type IncomingRoleBody = {
    name?: string;
    description?: string;
    facility_id?: string;
    facilityId?: string;
    department_id?: string;
    departmentId?: string;
    department?: string;
    priority?: string;
    mandatory?: boolean;
};

async function resolveDepartmentIdByName(req: NextRequest, facilityId: string, departmentName?: string): Promise<string | undefined> {
    if (!departmentName?.trim()) return undefined;

    try {
        const url = new URL(`${API_BASE_URL}/api/v1/departments`);
        url.searchParams.set('facility_id', facilityId);

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: getProxyHeaders(req),
        });
        if (!res.ok) return undefined;

        const data: unknown = await res.json();
        if (!Array.isArray(data)) return undefined;

        const normalizedName = departmentName.trim().toLowerCase();
        const matched = data.find((item: unknown) => {
            if (!item || typeof item !== 'object') return false;
            const rec = item as { name?: string };
            return typeof rec.name === 'string' && rec.name.trim().toLowerCase() === normalizedName;
        }) as { id?: string } | undefined;

        return matched?.id;
    } catch {
        return undefined;
    }
}

function normalizePriority(priority?: string): 'critical' | 'standard' {
    return priority?.trim().toLowerCase() === 'critical' ? 'critical' : 'standard';
}

function resolvePriority(body: IncomingRoleBody): 'critical' | 'standard' {
    if (typeof body.mandatory === 'boolean') {
        return body.mandatory ? 'critical' : 'standard';
    }
    return normalizePriority(body.priority);
}

// GET /roles - List roles (query params: facility_id, department_id, priority)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const url = new URL(`${API_BASE_URL}/api/v1/roles`);

        const facilityId = searchParams.get('facility_id') || await resolveFacilityId(req, API_BASE_URL);
        const departmentId = searchParams.get('department_id');
        const priority = searchParams.get('priority');

        if (facilityId) url.searchParams.set('facility_id', facilityId);
        if (departmentId) url.searchParams.set('department_id', departmentId);
        if (priority) url.searchParams.set('priority', priority);

        console.log('Proxy list roles request to:', url.toString());

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

// POST /roles - Create a role
export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as IncomingRoleBody;
        const facilityId = body.facility_id || body.facilityId || await resolveFacilityId(req, API_BASE_URL);
        const departmentIdFromBody = body.department_id || body.departmentId;
        const departmentId = facilityId
            ? (departmentIdFromBody || await resolveDepartmentIdByName(req, facilityId, body.department))
            : departmentIdFromBody;
        const payload = {
            name: body.name,
            description: body.description || '',
            facility_id: facilityId,
            department_id: departmentId,
            priority: resolvePriority(body),
        };
        const url = `${API_BASE_URL}/api/v1/roles`;

        console.log('Proxy create role request to:', url);

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
