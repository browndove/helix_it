import SetupAccountForm from '@/components/SetupAccountForm';

export default async function SetupAccountPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const rawToken = params.token;
    const token = Array.isArray(rawToken) ? (rawToken[0] || '') : (rawToken || '');

    return <SetupAccountForm token={token.trim()} />;
}
