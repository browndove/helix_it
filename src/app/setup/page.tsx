import { redirect } from 'next/navigation';

export default async function SetupAliasPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const sp = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) value.forEach(v => sp.append(key, v));
        else if (typeof value === 'string') sp.set(key, value);
    });

    const query = sp.toString();
    redirect(query ? `/setup-account?${query}` : '/setup-account');
}
