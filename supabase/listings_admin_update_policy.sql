-- Allow admin users to update listing status (approve / pause / reject).
-- If RLS is enabled on listings without an UPDATE policy,
-- every status change from the admin API is silently blocked.
-- Run this even if listings RLS has an existing update policy — the
-- "if not exists" name guard prevents duplicates.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'listings'
      and policyname = 'admin can update listing status'
  ) then
    execute $policy$
      create policy "admin can update listing status"
        on listings for update
        using (
          exists (
            select 1 from users where id = auth.uid() and role = 'admin'
          )
        )
    $policy$;
  end if;
end $$;
