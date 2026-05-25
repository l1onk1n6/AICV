/**
 * Datenbankoperationen für Supabase
 * Alle Funktionen sind "best-effort" – Fehler werden geloggt aber nicht geworfen,
 * damit die App offline weiter funktioniert.
 */
import { getSupabase, isSupabaseConfigured } from './supabase';
import type { Person, Resume, UploadedDocument, ApplicationStatus } from '../types/resume';
import type { Application } from '../store/trackerStore';

function sb() {
  return getSupabase();
}

async function userId(): Promise<string | null> {
  return sb().auth.getUser().then((r) => r.data.user?.id ?? null);
}

// ── Persons ────────────────────────────────────────────────

export async function fetchPersons(): Promise<Person[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await sb().from('persons').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map(rowToPerson);
  } catch (e) {
    console.warn('[db] fetchPersons', e);
    return [];
  }
}

export async function upsertPerson(person: Person): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const uid = await userId();
    if (!uid) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb().from('persons') as any).upsert({
      id: person.id,
      user_id: uid,
      name: person.name,
      avatar: person.avatar ?? null,
      active_resume_id: person.activeResumeId || null,
    });
  } catch (e) {
    console.warn('[db] upsertPerson', e);
  }
}

export async function deletePerson(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await sb().from('persons').delete().eq('id', id);
  } catch (e) {
    console.warn('[db] deletePerson', e);
  }
}

// ── Resumes ────────────────────────────────────────────────

export async function fetchResumes(): Promise<Resume[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await sb().from('resumes').select('*').order('created_at');
    if (error) throw error;
    return (data ?? []).map(rowToResume);
  } catch (e) {
    console.warn('[db] fetchResumes', e);
    return [];
  }
}

export async function upsertResume(resume: Resume): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const uid = await userId();
    if (!uid) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb().from('resumes') as any).upsert({
      id: resume.id,
      person_id: resume.personId,
      user_id: uid,
      name: resume.name,
      status: resume.status ?? 'entwurf',
      job_url: resume.jobUrl ?? '',
      deadline: resume.deadline ?? '',
      template_id: resume.templateId,
      accent_color: resume.accentColor,
      personal_info: resume.personalInfo,
      cover_letter: resume.coverLetter,
      work_experience: resume.workExperience,
      education: resume.education,
      skills: resume.skills,
      languages: resume.languages,
      projects: resume.projects,
      certificates: resume.certificates,
      custom_sections: resume.customSections ?? [],
      share_token: resume.shareToken ?? null,
      reminder_days: resume.reminderDays ?? [],
    });
  } catch (e) {
    console.warn('[db] upsertResume', e);
  }
}

export async function deleteResume(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await sb().from('resumes').delete().eq('id', id);
  } catch (e) {
    console.warn('[db] deleteResume', e);
  }
}

// ── Documents (Storage-basiert) ────────────────────────────
// Neu: Dateibytes liegen im Storage-Bucket "documents" unter {user_id}/{doc_id}.
// Die Tabelle "documents" enthaelt nur Metadaten + storage_path.
// Altbestand mit data_url (base64) wird beim Fetch transparent mitgeliefert
// und kann ueber migrateDocumentToStorage() lazy migriert werden.

const DOCUMENTS_BUCKET = 'documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 Stunde

/** Pfad im Bucket: {user_id}/{document_id} */
function storagePath(uid: string, docId: string) {
  return `${uid}/${docId}`;
}

/** base64 (data:mime;base64,...) → Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  const mime = m ? m[1] : 'application/octet-stream';
  const b64  = m ? m[2] : dataUrl;
  const bin  = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Datei in Storage hochladen. Gibt den storage_path zurueck oder null bei Fehler. */
export async function uploadDocumentFile(doc: UploadedDocument, blob: Blob): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const uid = await userId();
    if (!uid) return null;
    const path = storagePath(uid, doc.id);
    const { error } = await sb().storage.from(DOCUMENTS_BUCKET).upload(path, blob, {
      contentType: doc.type || 'application/octet-stream',
      upsert: true,
    });
    if (error) throw error;
    return path;
  } catch (e) {
    console.warn('[db] uploadDocumentFile', e);
    return null;
  }
}

/** Signierte URL fuer ein im Storage abgelegtes Dokument. */
async function signedUrlFor(path: string): Promise<string | null> {
  try {
    const { data, error } = await sb().storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    return data?.signedUrl ?? null;
  } catch (e) {
    console.warn('[db] signedUrlFor', e);
    return null;
  }
}

export async function fetchDocuments(): Promise<(UploadedDocument & { resumeId: string })[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await sb().from('documents')
      .select('*')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('uploaded_at', { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];

    const docs = await Promise.all(rows.map(async (row) => {
      const base = rowToDocument(row);
      const path = (row.storage_path as string) || null;
      if (path) {
        const url = await signedUrlFor(path);
        // Wenn Signing fehlschlaegt, lassen wir dataUrl leer — UI filtert dann.
        return { ...base, dataUrl: url ?? '' };
      }
      // Altbestand: data_url ist direkt base64
      return base;
    }));

    // Kaputte / unsigierbare Zeilen herausfiltern
    return docs.filter(d => d.dataUrl && d.dataUrl.length > 0);
  } catch (e) {
    console.warn('[db] fetchDocuments', e);
    return [];
  }
}

/**
 * Legt einen Metadaten-Datensatz an oder aktualisiert ihn.
 * Erwartet, dass die Datei vorher via uploadDocumentFile() im Storage liegt.
 * Fuer Altbestand (mit base64 data_url) wird das Feld weiterhin akzeptiert.
 */
export async function upsertDocument(resumeId: string, doc: UploadedDocument, opts?: { storagePath?: string }): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const uid = await userId();
    if (!uid) return;
    const path = opts?.storagePath ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb().from('documents') as any).upsert({
      id: doc.id,
      resume_id: resumeId,
      user_id: uid,
      name: doc.name,
      type: doc.type,
      size: doc.size,
      category: doc.category,
      // Nur setzen wenn wir tatsaechlich base64 haben (Altbestand / Fallback)
      data_url: path ? null : (doc.dataUrl && doc.dataUrl.startsWith('data:') ? doc.dataUrl : null),
      storage_path: path,
      order_index: doc.orderIndex ?? null,
    });
  } catch (e) {
    console.warn('[db] upsertDocument', e);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    // Pfad vor dem Loeschen holen, damit wir danach im Storage aufraeumen koennen
    const { data: row } = await sb().from('documents').select('storage_path').eq('id', id).maybeSingle();
    const path = (row as { storage_path?: string } | null)?.storage_path;
    await sb().from('documents').delete().eq('id', id);
    if (path) {
      await sb().storage.from(DOCUMENTS_BUCKET).remove([path]).catch((e) => console.warn('[db] storage remove', e));
    }
  } catch (e) {
    console.warn('[db] deleteDocument', e);
  }
}

/**
 * Einmal-Migration: bestehenden base64-Eintrag in Storage verschieben.
 * Greift nur, wenn data_url gesetzt ist und noch kein storage_path existiert.
 * Wird vom Store beim syncFromCloud transparent aufgerufen.
 */
export async function migrateDocumentToStorage(_resumeId: string, doc: UploadedDocument): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  if (!doc.dataUrl || !doc.dataUrl.startsWith('data:')) return null;
  try {
    const blob = dataUrlToBlob(doc.dataUrl);
    const path = await uploadDocumentFile(doc, blob);
    if (!path) return null;
    const uid = await userId();
    if (!uid) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb().from('documents') as any).update({
      storage_path: path,
      data_url: null,
    }).eq('id', doc.id);
    return path;
  } catch (e) {
    console.warn('[db] migrateDocumentToStorage', e);
    return null;
  }
}

// ── Applications (Bewerbungs-Tracker) ──────────────────────

export async function fetchApplications(): Promise<Application[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await sb().from('applications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToApplication);
  } catch (e) {
    console.warn('[db] fetchApplications', e);
    return [];
  }
}

export async function upsertApplication(app: Application): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const uid = await userId();
    if (!uid) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb().from('applications') as any).upsert({
      id: app.id,
      user_id: uid,
      company: app.company,
      position: app.position,
      status: app.status,
      type: app.type,
      applied_date: app.appliedDate,
      deadline: app.deadline,
      notes: app.notes,
      url: app.url,
      resume_id: app.resumeId,
    });
  } catch (e) {
    console.warn('[db] upsertApplication', e);
  }
}

export async function deleteApplication(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await sb().from('applications').delete().eq('id', id);
  } catch (e) {
    console.warn('[db] deleteApplication', e);
  }
}

function rowToApplication(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    company: (row.company as string) ?? '',
    position: (row.position as string) ?? '',
    status: ((row.status as Application['status']) ?? 'offen'),
    type: ((row.type as Application['type']) ?? 'online'),
    appliedDate: (row.applied_date as string) ?? '',
    deadline: (row.deadline as string) ?? '',
    notes: (row.notes as string) ?? '',
    url: (row.url as string) ?? '',
    resumeId: (row.resume_id as string) ?? '',
  };
}

// ── Row mappers ────────────────────────────────────────────

function rowToPerson(row: Record<string, unknown>): Person {
  return {
    id: row.id as string,
    name: row.name as string,
    avatar: (row.avatar as string) ?? undefined,
    activeResumeId: (row.active_resume_id as string) ?? '',
    resumeIds: [],          // wird aus Resumes befüllt
    createdAt: row.created_at as string,
  };
}

function rowToResume(row: Record<string, unknown>): Resume {
  return {
    id: row.id as string,
    personId: row.person_id as string,
    name: (row.name as string) || 'Bewerbungsmappe',
    status: ((row.status as ApplicationStatus) || 'entwurf'),
    jobUrl: (row.job_url as string) ?? '',
    deadline: (row.deadline as string) ?? '',
    templateId: row.template_id as Resume['templateId'],
    accentColor: row.accent_color as string,
    personalInfo: (row.personal_info as Resume['personalInfo']) ?? {},
    coverLetter: (row.cover_letter as Resume['coverLetter']) ?? { recipient: '', subject: '', body: '', closing: 'Mit freundlichen Grüssen' },
    workExperience: (row.work_experience as Resume['workExperience']) ?? [],
    education: (row.education as Resume['education']) ?? [],
    skills: (row.skills as Resume['skills']) ?? [],
    languages: (row.languages as Resume['languages']) ?? [],
    projects: (row.projects as Resume['projects']) ?? [],
    certificates: (row.certificates as Resume['certificates']) ?? [],
    documents: [],
    customSections: (row.custom_sections as Resume['customSections']) ?? [],
    shareToken: (row.share_token as string) ?? undefined,
    shareViews: typeof row.share_views === 'number' ? row.share_views : undefined,
    lastViewedAt: (row.last_viewed_at as string) ?? undefined,
    reminderDays: (row.reminder_days as number[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Public shared resume (no auth required) ────────────────
export async function fetchSharedResume(token: string): Promise<Resume | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    // Token-gebundene RPC statt direktem Tabellen-SELECT: gibt nur die zum
    // Token passende Zeile zurueck (keine Enumeration aller geteilten Mappen).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb() as any).rpc('get_shared_resume', { p_token: token });
    const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : null;
    if (error || !row) return null;
    const resume = rowToResume(row);

    // Aufruf-Zaehler erhoehen — fire-and-forget, nicht blockierend.
    // RPC ist SECURITY DEFINER und damit auch fuer anon-Besucher erlaubt.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb() as any).rpc('increment_share_view', { token }).then(({ error: rpcErr }: { error: unknown }) => {
      if (rpcErr) console.warn('[db] increment_share_view', rpcErr);
    });

    // Dokumente des geteilten Resumes zusaetzlich laden — ebenfalls token-
    // gebunden ueber SECURITY-DEFINER-RPC.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: docRows } = await (sb() as any).rpc('get_shared_documents', { p_token: token });

      const rows = (docRows ?? []) as Record<string, unknown>[];
      const docs = await Promise.all(rows.map(async (row) => {
        const base = rowToDocument(row);
        const path = (row.storage_path as string) || null;
        if (path) {
          const url = await signedUrlFor(path);
          return { ...base, dataUrl: url ?? '' };
        }
        return base;
      }));
      resume.documents = docs
        .filter(d => d.dataUrl && d.dataUrl.length > 0)
        .map(({ resumeId: _rid, ...d }) => d);
    } catch (e) {
      console.warn('[db] fetchSharedResume docs', e);
    }

    return resume;
  } catch (e) {
    console.warn('[db] fetchSharedResume', e);
    return null;
  }
}

function rowToDocument(row: Record<string, unknown>): UploadedDocument & { resumeId: string } {
  return {
    resumeId: row.resume_id as string,
    id: row.id as string,
    name: row.name as string,
    type: row.type as string,
    size: row.size as number,
    category: row.category as UploadedDocument['category'],
    // Bei Storage-Dokumenten setzt fetchDocuments() dies nachtraeglich auf die Signed URL.
    // Bei Altbestand (data_url gesetzt) bleibt's die base64-Data-URL.
    dataUrl: (row.data_url as string) ?? '',
    uploadedAt: row.uploaded_at as string,
    orderIndex: typeof row.order_index === 'number' ? row.order_index : undefined,
  };
}
