import { route } from '@/lib/server/http';
import { endSession } from '@/lib/server/auth';
import { buildState } from '@/lib/server/state';

export const POST = route(async () => { await endSession(); return { state: await buildState(null) }; });
