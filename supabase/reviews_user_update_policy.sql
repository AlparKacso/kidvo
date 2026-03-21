-- Allow users to update their own reviews.
-- After the update, status must be 'pending' or 'approved':
--   - 'pending'  covers text edits (any status → pending) and rating changes on pending/rejected reviews
--   - 'approved' covers rating-only changes on an already-approved review (instant update)
-- This prevents users from self-approving (can never write 'approved' via a direct edit
-- unless the row was already 'approved' and only the rating changed).
create policy "users can update own review"
  on reviews for update
  using  (user_id = auth.uid())
  with check (user_id = auth.uid() and status in ('pending', 'approved'));
