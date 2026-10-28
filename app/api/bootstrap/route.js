import { route } from '@/lib/server/http';
import { getUser } from '@/lib/server/auth';
import { buildState } from '@/lib/server/state';

export const dynamic = 'force-dynamic';
export const GET = route(async () => ({ state: await buildState(await getUser()) }));
