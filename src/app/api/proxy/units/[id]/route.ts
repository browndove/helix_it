import { getProxyHeaders } from '@/lib/proxy-auth';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// GET /units/:id — Single unit + patient count
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(`${API_BASE_URL}/api/v1/units/${id}`, {
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

// PUT /units/:id — Update unit
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const res = await fetch(`${API_BASE_URL}/api/v1/units/${id}`, {
            method: 'PUT',
            headers: getProxyHeaders(req),
            body: JSON.stringify(body),
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

// DELETE /units/:id — Delete unit
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const res = await fetch(`${API_BASE_URL}/api/v1/units/${id}`, {
            method: 'DELETE',
            headers: getProxyHeaders(req),
        });
        const text = await res.text();
        let data: unknown = {};
        if (text.trim()) {
            try { data = JSON.parse(text); } catch {
                return NextResponse.json({ error: 'Backend returned invalid response', details: text.substring(0, 200) }, { status: 502 });
            }
        }
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: 'Proxy error', details: message }, { status: 500 });
    }
}
