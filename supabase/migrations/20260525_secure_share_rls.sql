-- 20260525_secure_share_rls.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Sicherheitsfix: Geteilte Lebenslaeufe duerfen nur noch von jemandem gelesen
-- werden, der den Share-Token KENNT — nicht mehr von jedem Anon-Nutzer pauschal.
--
-- Problem vorher:
--   Die Policy  USING (share_token IS NOT NULL)  hat KEINE Kenntnis des Tokens
--   verlangt. Mit dem oeffentlichen Anon-Key konnte man
--     GET /rest/v1/resumes?share_token=not.is.null&select=*
--   abfragen und ALLE geteilten Mappen + Dokumente aller Nutzer auslesen.
--
-- Fix:
--   - Breite Anon-SELECT-Policies auf resumes/documents/storage entfernen.
--   - Zugriff nur noch ueber SECURITY-DEFINER-RPCs, die den Token als Pflicht-
--     parameter nehmen und ausschliesslich die passende Zeile zurueckgeben.
--   - Storage-SELECT fuer geteilte Dokumente ueber einen Definer-Helper, damit
--     signierte URLs weiter funktionieren (Pfade sind {user_id}/{doc_id}-UUIDs
--     und werden nur ueber die token-gebundene RPC offengelegt).
--
-- Owner-Policies (auth.uid() = user_id) bleiben unangetastet.
-- Run in: Supabase Dashboard → SQL Editor (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Alte, zu weite Anon-Policies entfernen ───────────────────────────────
drop policy if exists "Public can read shared resumes" on public.resumes;
drop policy if exists "documents_shared_select"        on public.documents;
drop policy if exists "documents_shared_select_storage" on storage.objects;

-- ── 2. RPC: geteilten Lebenslauf per Token holen ────────────────────────────
-- SECURITY DEFINER → umgeht RLS, filtert aber strikt auf den uebergebenen Token.
-- Gibt nur die EINE passende Zeile zurueck → keine Enumeration moeglich.
create or replace function public.get_shared_resume(p_token text)
returns setof public.resumes
language sql
security definer
set search_path = ''
stable
as $$
  select r.*
  from public.resumes r
  where r.share_token = p_token
    and r.share_token is not null
  limit 1;
$$;

revoke all on function public.get_shared_resume(text) from public;
grant execute on function public.get_shared_resume(text) to anon, authenticated;

-- ── 3. RPC: Dokumente eines geteilten Lebenslaufs per Token holen ───────────
create or replace function public.get_shared_documents(p_token text)
returns setof public.documents
language sql
security definer
set search_path = ''
stable
as $$
  select d.*
  from public.documents d
  join public.resumes r on r.id = d.resume_id
  where r.share_token = p_token
    and r.share_token is not null
  order by d.order_index asc nulls last, d.uploaded_at asc;
$$;

revoke all on function public.get_shared_documents(text) from public;
grant execute on function public.get_shared_documents(text) to anon, authenticated;

-- ── 4. Storage: signierte URLs fuer geteilte Dokumente ──────────────────────
-- Helper laeuft als Definer (umgeht RLS), damit die Storage-Policy die Tabellen
-- sehen kann, obwohl Anon dort keinen direkten SELECT mehr hat.
create or replace function public.is_shared_document_path(p_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.documents d
    join public.resumes r on r.id = d.resume_id
    where d.storage_path = p_name
      and r.share_token is not null
  );
$$;

revoke all on function public.is_shared_document_path(text) from public;
grant execute on function public.is_shared_document_path(text) to anon, authenticated;

drop policy if exists "documents_shared_select_storage" on storage.objects;
create policy "documents_shared_select_storage" on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and public.is_shared_document_path(name)
  );
