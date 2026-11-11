import {
  fail,
  getUserById,
  json,
  readBody,
  requireUser,
  upsertAppleSubscription,
  type Ctx,
} from '../../lib/api';
import { verifyStoreKitTransaction } from '../../lib/jws';

const BUNDLE_ID = 'com.lifenum.wuxing';
const ALLOWED_PRODUCTS = new Set(['com.lifenum.wuxing.monthly']);
const MAX_TRANSACTIONS = 10;

interface Input {
  transactions?: unknown;
}

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const body = await readBody<Input>(request);
  const candidates = Array.isArray(body.transactions)
    ? body.transactions.filter((value): value is string => typeof value === 'string')
    : [];
  if (candidates.length === 0 || candidates.length > MAX_TRANSACTIONS) {
    return fail('INVALID_INPUT', 422);
  }

  let best: { end: number; originalId: string; productId: string } | null = null;

  for (const jws of candidates) {
    let transaction;
    try {
      transaction = await verifyStoreKitTransaction(jws);
    } catch {
      continue;
    }
    if (transaction.bundleId !== BUNDLE_ID) continue;
    if (!transaction.productId || !ALLOWED_PRODUCTS.has(transaction.productId)) continue;
    if (transaction.revocationDate) continue;
    if (
      transaction.appAccountToken &&
      transaction.appAccountToken.toLowerCase() !== user.id.toLowerCase()
    ) {
      continue;
    }

    const end = transaction.expiresDate ? Math.floor(transaction.expiresDate / 1000) : 0;
    if (!best || end > best.end) {
      best = {
        end,
        originalId: String(
          transaction.originalTransactionId ?? transaction.transactionId ?? 'unknown',
        ),
        productId: transaction.productId,
      };
    }
  }

  if (!best) return fail('NO_VALID_TRANSACTION', 404);

  const now = Math.floor(Date.now() / 1000);
  const status = best.end > now ? 'active' : 'expired';
  await upsertAppleSubscription(env, user.id, status, best.end, best.originalId, best.productId);

  return json({
    user: await getUserById(env, user.id),
    status,
    currentPeriodEnd: best.end,
  });
};
