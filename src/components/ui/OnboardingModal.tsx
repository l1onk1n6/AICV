import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, FileText, Sparkles, Share2, Bell, Wand2 } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { LogoIcon } from '../layout/Logo';
import { markOnboardingDone } from '../../lib/onboarding';
import { useT } from '../../lib/i18n';

const FEATURES = [
  { icon: <FileText size={18} />, color: 'var(--ios-blue)', title: 'Bewerbungsmappen', desc: 'Erstelle für jede Stelle eine eigene Mappe mit Lebenslauf und Anschreiben.' },
  { icon: <Sparkles size={18} />, color: '#FF9F0A', title: 'KI-Unterstützung', desc: 'Lass dir Anschreiben generieren, Texte verbessern und in andere Sprachen übersetzen.' },
  { icon: <Share2 size={18} />, color: '#5856D6', title: 'Link teilen & Export', desc: 'Teile deinen Lebenslauf als Link oder exportiere ihn als professionelles PDF.' },
  { icon: <Bell size={18} />, color: 'var(--ios-green)', title: 'Deadline-Reminder', desc: 'Verpasse keine Bewerbungsfrist — erhalte Erinnerungen per E-Mail.' },
];

function buildSampleData(firstName: string, lastName: string) {
  const fn = firstName || 'Max';
  const ln = lastName || 'Mustermann';
  return {
    personalInfo: {
      firstName: fn, lastName: ln,
      title: 'Projektleiterin',
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@beispiel.ch`,
      phone: '+41 79 123 45 67',
      street: 'Musterstrasse 12',
      location: '8001 Zürich',
      website: '',
      linkedin: `linkedin.com/in/${fn.toLowerCase()}${ln.toLowerCase()}`,
      github: '',
      summary: 'Organisationsstarke Projektleiterin mit mehrjaehriger Erfahrung in der Planung und Umsetzung von Kundenprojekten. Kommunikativ, strukturiert und loesungsorientiert — mit Freude an Teamarbeit und bereichsuebergreifender Zusammenarbeit.',
    },
    workExperience: [
      {
        id: 'sample-job-1',
        company: 'Muster AG', position: 'Projektleiterin',
        location: 'Zürich', startDate: '2022-03', endDate: '', current: true,
        description: 'Verantwortlich fuer die Steuerung von Kundenprojekten von der Konzeption bis zur Uebergabe. Koordination von internen und externen Partnern, Budget- und Terminverantwortung sowie Reporting an die Geschaeftsleitung.',
        highlights: [],
      },
      {
        id: 'sample-job-2',
        company: 'Beispiel GmbH', position: 'Assistentin der Geschaeftsleitung',
        location: 'Basel', startDate: '2019-06', endDate: '2022-02', current: false,
        description: 'Unterstuetzung der Geschaeftsleitung im Tagesgeschaeft, Organisation von Terminen und Veranstaltungen, Aufbereitung von Auswertungen und Praesentationen, Korrespondenz mit Kundinnen und Kunden.',
        highlights: [],
      },
    ],
    education: [
      {
        id: 'sample-edu-1',
        degree: 'Bachelor', field: 'Betriebsoekonomie',
        institution: 'Fachhochschule Musterstadt', location: 'Zürich',
        startDate: '2015-09', endDate: '2019-06', grade: '5.2',
        description: 'Schwerpunkte: Projektmanagement, Marketing und Kommunikation.',
      },
    ],
    skills: [
      { id: 's1', name: 'Projektmanagement',   level: 5 as const, category: 'Methodik' },
      { id: 's2', name: 'Kommunikation',       level: 5 as const, category: 'Sozial' },
      { id: 's3', name: 'MS Office',           level: 5 as const, category: 'Tools' },
      { id: 's4', name: 'Budget & Controlling',level: 4 as const, category: 'Methodik' },
      { id: 's5', name: 'Praesentation',       level: 4 as const, category: 'Sozial' },
      { id: 's6', name: 'Teamfuehrung',        level: 4 as const, category: 'Sozial' },
    ],
    languages: [
      { id: 'l1', name: 'Deutsch',      level: 'Muttersprache' as const },
      { id: 'l2', name: 'Englisch',     level: 'Fließend' as const },
      { id: 'l3', name: 'Französisch',  level: 'Grundkenntnisse' as const },
    ],
  };
}

interface Props {
  onClose: () => void;
}

export default function OnboardingModal({ onClose }: Props) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const { addPerson, persons, updateResume } = useResumeStore();
  const navigate = useNavigate();
  const hasPersons = persons.length > 0;

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    await addPerson(name.trim());
    setCreating(false);
    setStep(2);
  }

  function goNext() {
    setStep(hasPersons ? 2 : 1);
  }

  function finish(withSampleData: boolean) {
    markOnboardingDone();
    if (withSampleData) {
      const { persons: currentPersons, resumes: currentResumes } = useResumeStore.getState();
      const activePerson = currentPersons[0];
      if (activePerson) {
        const resume = currentResumes.find(r => r.personId === activePerson.id);
        if (resume) {
          const nameParts = (name.trim() || activePerson.name).split(' ');
          const firstName = nameParts[0] ?? '';
          const lastName = nameParts.slice(1).join(' ') || firstName;
          updateResume(resume.id, buildSampleData(firstName, lastName));
        }
      }
    }
    onClose();
    navigate('/editor');
  }

  function skip() {
    markOnboardingDone();
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)',
      padding: '20px 16px',
    }}>
      <div className="glass-card animate-scale-in" style={{
        width: '100%', maxWidth: 440, padding: '32px 28px',
        background: 'var(--bg-overlay)',
        border: '1px solid rgba(var(--rgb-fg),0.1)',
        boxShadow: 'var(--shadow-overlay)',
      }}>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}><LogoIcon size={56} /></div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Willkommen bei PATH
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(var(--rgb-fg),0.5)', margin: '0 0 28px', lineHeight: 1.6 }}>
              Dein persönlicher Bewerbungsassistent.<br />
              Lass uns in 2 Minuten alles einrichten.
            </p>
            <button className="btn-glass btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontWeight: 700, fontSize: 15, gap: 8 }}
              onClick={goNext}>
              Loslegen <ArrowRight size={16} />
            </button>
            <button onClick={skip} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--rgb-fg),0.3)', fontSize: 12, fontFamily: 'var(--font-sf)' }}>
              Überspringen
            </button>
          </div>
        )}

        {/* Step 1: Create person */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ios-blue)', marginBottom: 6 }}>{t('SCHRITT 1 VON 2')}</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.4px' }}>{t('Wie heisst du?')}</h2>
              <p style={{ fontSize: 13, color: 'rgba(var(--rgb-fg),0.45)', margin: 0 }}>{t('Wir legen dein erstes Profil an.')}</p>
            </div>
            <input
              className="input-glass"
              placeholder={t('Vorname Nachname')}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && handleCreate()}
              autoFocus maxLength={100}
              style={{ marginBottom: 16, fontSize: 15 }}
            />
            <button className="btn-glass btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontWeight: 700, gap: 8 }}
              disabled={!name.trim() || creating}
              onClick={handleCreate}>
              {creating ? t('Erstelle…') : <>{t('Profil anlegen')} <ArrowRight size={15} /></>}
            </button>
            <button onClick={skip} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--rgb-fg),0.3)', fontSize: 12, fontFamily: 'var(--font-sf)', width: '100%' }}>
              Überspringen
            </button>
          </div>
        )}

        {/* Step 2: Features + sample data choice */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ios-blue)', marginBottom: 6 }}>{t('SCHRITT 2 VON 2')}</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.4px' }}>{t('Was PATH kann')}</h2>
              <p style={{ fontSize: 13, color: 'rgba(var(--rgb-fg),0.45)', margin: 0 }}>
                Ein kurzer Überblick — du findest alles auch später wieder.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {FEATURES.map(f => (
                <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${f.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{t(f.title)}</div>
                    <div style={{ fontSize: 12, color: 'rgba(var(--rgb-fg),0.45)', lineHeight: 1.5 }}>{t(f.desc)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sample data card */}
            <div style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Wand2 size={14} style={{ color: 'var(--ios-blue)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t('Mit Beispieldaten starten')}</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(var(--rgb-fg),0.45)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Sieh sofort wie dein Lebenslauf aussehen könnte — wir füllen ihn mit realistischen Musterdaten vor.
              </p>
              <button className="btn-glass btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontWeight: 700, fontSize: 13, gap: 7 }}
                onClick={() => finish(true)}>
                <Wand2 size={14} /> Beispieldaten laden & starten
              </button>
            </div>

            <button className="btn-glass" style={{ width: '100%', justifyContent: 'center', padding: '11px', gap: 7, fontSize: 13 }}
              onClick={() => finish(false)}>
              <Check size={14} /> Ohne Beispieldaten starten
            </button>

            <button onClick={skip} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--rgb-fg),0.3)', fontSize: 12, fontFamily: 'var(--font-sf)', width: '100%' }}>
              Schliessen
            </button>
          </div>
        )}

        {step > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ width: s === step ? 20 : 6, height: 6, borderRadius: 3, background: s === step ? 'var(--ios-blue)' : 'rgba(var(--rgb-fg),0.15)', transition: 'all 0.3s' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
