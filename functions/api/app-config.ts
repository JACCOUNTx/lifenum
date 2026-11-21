import { fail, json, type Ctx } from '../lib/api';
import { readAppConfig } from '../lib/appConfig';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'GET') return fail('METHOD_NOT_ALLOWED', 405);
  const config = await readAppConfig(env);
  return json(config, 200, {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  });
};
