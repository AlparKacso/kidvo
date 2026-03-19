-- Allow admin users to update review status (approve / reject).
-- RLS is enabled on reviews but there was no UPDATE policy,
-- so every status update from the moderate API was silently blocked.

create policy "admin can update review status"
  on reviews for update
  using (
    exists (
      select 1 from users where id = auth.uid() and role = 'admin'
    )
  );
