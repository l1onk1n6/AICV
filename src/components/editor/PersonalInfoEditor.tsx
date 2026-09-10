import { useCallback, useState } from 'react';
import { User, Mail, Phone, MapPin, Globe, Link2, FileText, Camera, AlertCircle } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { validatePhotoFile, sanitizePhotoUrl } from '../../lib/security';
import { usePlan } from '../../lib/plan';
import { useIsMobile } from '../../hooks/useIsMobile';
import LinkedInImportDialog from './LinkedInImport';
import { useT } from '../../lib/i18n';

export default function PersonalInfoEditor() {
  const t = useT();
  const { getActiveResume, updatePersonalInfo } = useResumeStore();
  const { limits } = usePlan();
  const resume = getActiveResume();
  const [photoError, setPhotoError] = useState('');
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const isMobile = useIsMobile();

  const update = useCallback((field: string, value: string) => {
    if (!resume) return;
    updatePersonalInfo(resume.id, { [field]: value });
  }, [resume, updatePersonalInfo]);

  if (!resume) return null;

  const { personalInfo: info } = resume;

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !resume) return;
    const { valid, error } = validatePhotoFile(file, limits.photoMb);
    if (!valid) {
      setPhotoError(error ?? t('Ungültige Datei.'));
      e.target.value = '';
      return;
    }
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const safe = sanitizePhotoUrl(dataUrl);
      if (safe) updatePersonalInfo(resume.id, { photo: safe });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="animate-fade-in">
      {showLinkedIn && <LinkedInImportDialog onClose={() => setShowLinkedIn(false)} />}

      {/* LinkedIn import button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn-glass btn-sm" onClick={() => setShowLinkedIn(true)} style={{ fontSize: 12, gap: 6 }}>
          <span style={{ fontSize: 14 }}>in</span> LinkedIn importieren
        </button>
      </div>

      {/* Photo + Name row */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
        {/* Photo */}
        <div style={{ flexShrink: 0, position: 'relative' }}>
          <label style={{ cursor: 'pointer' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: info.photo ? 'transparent' : 'rgba(var(--rgb-fg),0.1)',
              border: '2px solid rgba(var(--rgb-fg),0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', transition: '0.2s',
              cursor: 'pointer',
            }}>
              {info.photo ? (
                <img src={info.photo} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
                  <Camera size={20} />
                  <div style={{ fontSize: 9, marginTop: 3 }}>{t('Foto')}</div>
                </div>
              )}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {photoError && (
          <div style={{
            position: 'absolute', bottom: -24, left: 0, right: 0,
            fontSize: 10, color: 'var(--ios-red)', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <AlertCircle size={10} /> {photoError}
          </div>
        )}

        {/* Name fields — Mobile: Vorname/Nachname in 2 Spalten neben dem Foto,
            Berufsbezeichnung ausserhalb (siehe unten) damit die Foto-Spalte
            keinen Leerraum darunter hat. Desktop: alles in einem 2-Spalten-Grid. */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="section-label">{t('Vorname')}</label>
            <input className="input-glass" placeholder={t('Max')} value={info.firstName} maxLength={50}
              onChange={(e) => update('firstName', e.target.value)} />
          </div>
          <div>
            <label className="section-label">{t('Nachname')}</label>
            <input className="input-glass" placeholder={t('Mustermann')} value={info.lastName} maxLength={50}
              onChange={(e) => update('lastName', e.target.value)} />
          </div>
          {!isMobile && (
            <div style={{ gridColumn: 'span 2' }}>
              <label className="section-label">
                <FileText size={10} style={{ display: 'inline', marginRight: 4 }} />{t('Berufsbezeichnung')}
              </label>
              <input className="input-glass" placeholder={t('z.B. Senior Software Engineer')} value={info.title} maxLength={100}
                onChange={(e) => update('title', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Berufsbezeichnung separat, nach dem Foto-Row, damit voller Breite */}
      {isMobile && (
        <div style={{ marginBottom: 16 }}>
          <label className="section-label">
            <FileText size={10} style={{ display: 'inline', marginRight: 4 }} />{t('Berufsbezeichnung')}
          </label>
          <input className="input-glass" placeholder={t('z.B. Senior Software Engineer')} value={info.title} maxLength={100}
            onChange={(e) => update('title', e.target.value)} />
        </div>
      )}

      {/* Contact */}
      <div className="section-label">
        <User size={10} style={{ display: 'inline', marginRight: 4 }} />{t('Kontaktdaten')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <label className="section-label">
            <Mail size={9} style={{ display: 'inline', marginRight: 3 }} />{t('E-Mail')}
          </label>
          <input className="input-glass" type="email" placeholder="max@beispiel.de" value={info.email} maxLength={254}
            onChange={(e) => update('email', e.target.value)} />
        </div>
        <div>
          <label className="section-label">
            <Phone size={9} style={{ display: 'inline', marginRight: 3 }} />{t('Telefon')}
          </label>
          <input className="input-glass" type="tel" placeholder={t('+49 123 456789')} value={info.phone} maxLength={30}
            onChange={(e) => update('phone', e.target.value)} />
        </div>
        <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
          <label className="section-label">
            <MapPin size={9} style={{ display: 'inline', marginRight: 3 }} />{t('Strasse und Hausnummer')}
          </label>
          <input className="input-glass" placeholder={t('Musterstrasse 12')} value={info.street ?? ''} maxLength={150}
            onChange={(e) => update('street', e.target.value)} />
        </div>
        <div>
          <label className="section-label">
            <MapPin size={9} style={{ display: 'inline', marginRight: 3 }} />{t('Ort / PLZ')}
          </label>
          <input className="input-glass" placeholder={t('8000 Zürich')} value={info.location} maxLength={100}
            onChange={(e) => update('location', e.target.value)} />
        </div>
        <div>
          <label className="section-label">
            <Globe size={9} style={{ display: 'inline', marginRight: 3 }} />{t('Website')}
          </label>
          <input className="input-glass" placeholder={t('www.beispiel.de')} value={info.website} maxLength={300}
            onChange={(e) => update('website', e.target.value)} />
        </div>
        <div>
          <label className="section-label">
            <Link2 size={9} style={{ display: 'inline', marginRight: 3 }} />{t('LinkedIn')}
          </label>
          <input className="input-glass" placeholder={t('linkedin.com/in/max')} value={info.linkedin} maxLength={200}
            onChange={(e) => update('linkedin', e.target.value)} />
        </div>
        <div>
          <label className="section-label">
            <Link2 size={9} style={{ display: 'inline', marginRight: 3 }} />{t('GitHub')}
          </label>
          <input className="input-glass" placeholder={t('github.com/max')} value={info.github} maxLength={200}
            onChange={(e) => update('github', e.target.value)} />
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="section-label">{t('Kurzzusammenfassung / Profil')}</label>
        <textarea
          className="input-glass"
          placeholder={t('Kurze Beschreibung Ihrer Berufserfahrung, Stärken und Ziele...')}
          value={info.summary}
          onChange={(e) => update('summary', e.target.value)}
          maxLength={800}
          style={{ minHeight: 100 }}
        />
      </div>
    </div>
  );
}
