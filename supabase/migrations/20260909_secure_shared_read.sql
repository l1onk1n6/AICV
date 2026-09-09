-- 20260909_secure_shared_read.sql
-- SICHERHEIT: Schliesst die anonyme Enumeration ALLER geteilten Lebenslaeufe.
--
-- Bisher gaben mehrere Policies (resumes/documents/storage/share_links) den
-- Lesezugriff frei, sobald IRGENDEIN Token gesetzt war ("share_token IS NOT
-- NULL" bzw. "is_active = true") — der Token wurde nie geprueft. Mit dem
-- oeffentlichen anon-Key konnte damit jeder saemtliche geteilten Mappen samt
-- Dokumenten lesen, ohne einen Link zu kennen.
--
-- Neuer Ansatz: Der Besucher muss den Token im Header 'x-share-token' senden.
-- Die Policy gibt genau die eine Zeile frei, deren share_token exakt passt.
-- Idempotent (drop ... if exists vor jedem create), damit CI-Wiederholungen
-- und frische Datenbanken gleich enden.

-- 1) Alte, offene Policies entfernen ----------------------------------------
drop policy if exists "Public can read shared resumes"                on public.resumes;
drop policy if exists "public can read shared resumes"                on public.resumes;
drop policy if exists "Public can read resumes with active share link" on public.resumes;
drop policy if exists "documents_shared_select"                       on public.documents;
drop policy if exists "documents_shared_select_storage"               on storage.objects;
drop policy if exists "Public can read active share links"            on public.share_links;

-- 2) Helper: liest den x-share-token-Header (fehlend/leer -> NULL) -----------
create or replace function public.current_share_token()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-share-token',
    ''
  );
$$;

-- 3) Neue, token-gebundene Lesepolicies -------------------------------------
drop policy if exists "shared resume via header token" on public.resumes;
create policy "shared resume via header token" on public.resumes
  for select to anon, authenticated
  using (
    share_token is not null
    and share_token = public.current_share_token()
  );

drop policy if exists "shared documents via header token" on public.documents;
create policy "shared documents via header token" on public.documents
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.resumes r
      where r.id = documents.resume_id
        and r.share_token is not null
        and r.share_token = public.current_share_token()
    )
  );

drop policy if exists "shared storage via header token" on storage.objects;
create policy "shared storage via header token" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.documents d
      join public.resumes r on r.id = d.resume_id
      where d.storage_path = storage.objects.name
        and r.share_token is not null
        and r.share_token = public.current_share_token()
    )
  );
