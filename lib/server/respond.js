import { getUser } from './auth';
import { buildState } from './state';

/** Mutation response: result + fresh state for whoever is signed in (one round-trip for the UI). */
export async function withState(extra = {}) {
  const user = await getUser();
  return { ...extra, state: await buildState(user) };
}
