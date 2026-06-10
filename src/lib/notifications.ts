import type { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationType } from '@/types/database'

/**
 * Insert an in-app notification. Always called with the service-role client
 * (parents have no INSERT policy on notifications). Best-effort: a failed
 * insert must never break the surrounding action, so callers fire-and-log.
 */
export async function createNotification(
  adminDb: ReturnType<typeof createAdminClient>,
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await adminDb.from('notifications').insert({ user_id: userId, type, payload } as any)
  if (error) console.error('[notification]', type, error.message)
}
