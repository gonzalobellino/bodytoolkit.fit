import React, { useState, useEffect } from 'react';
import type { FormLang, Questionnaire, FunctionalScale } from '../types';
import { getText } from '../utils/formI18n';
import { FormQuestionnaire, formatFormAnswer, buildQuestionnaireSummary } from './Questionnaires';

const FILE_MAP: Record<string, string> = {
  cq: 'client-questionnaire',
  parq: 'physical-activity-readiness',
  lefs: 'lefs',
  uefi: 'uefi',
};

const ALLOWED_IDS = new Set(Object.keys(FILE_MAP));

const APP_NAME = 'Corrective Exercise Toolkit';
const APP_HOME_HASH = '#/';

const UI_STRINGS: Record<FormLang, {
  loading: string; invalidLink: string; invalidLinkHint: string; submitted: string; submittedHint: string;
  sendError: string; networkError: string; clearance: string; submit: string; sending: string; allRequired: string; footer: string;
  clientDetails: string; firstName: string; lastName: string; email: string;
}> = {
  en: {
    loading: 'Loading…',
    invalidLink: 'This form link is not valid.',
    invalidLinkHint: 'Please ask your coach for a new link.',
    submitted: 'Submitted!',
    submittedHint: 'Your responses have been sent to your coach. You can close this page.',
    sendError: 'Failed to send. Please try again.',
    networkError: 'Network error. Please try again.',
    clearance: 'You answered YES to at least one readiness question. Consider medical clearance before starting a vigorous program.',
    submit: 'Submit Assessment',
    sending: 'Sending…',
    allRequired: 'All fields required',
    footer: 'When you submit, your responses will be sent by email to',
    clientDetails: 'Client details',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
  },
  es: {
    loading: 'Cargando…',
    invalidLink: 'Este enlace del formulario no es válido.',
    invalidLinkHint: 'Pide a tu entrenador un nuevo enlace.',
    submitted: '¡Enviado!',
    submittedHint: 'Tus respuestas se han enviado a tu entrenador. Puedes cerrar esta página.',
    sendError: 'Error al enviar. Inténtalo de nuevo.',
    networkError: 'Error de red. Inténtalo de nuevo.',
    clearance: 'Has respondido SÍ al menos a una pregunta de disposición. Considera obtener autorización médica antes de iniciar un programa vigoroso.',
    submit: 'Enviar evaluación',
    sending: 'Enviando…',
    allRequired: 'Todos los campos son obligatorios',
    footer: 'Al enviar, tus respuestas se enviarán por correo a',
    clientDetails: 'Datos del cliente',
    firstName: 'Nombre',
    lastName: 'Apellidos',
    email: 'Email',
  },
};

/** Field IDs for client prefill per form (first name, last name, email). */
const PREFILL_IDS: Record<string, { first: string; last: string; email: string }> = {
  cq: { first: 'cq_first_name', last: 'cq_last_name', email: 'cq_email' },
  parq: { first: 'parq_first_name', last: 'parq_last_name', email: 'parq_email' },
};

interface ClientFormViewProps {
  formId: string;
  formType: string;
  lang: FormLang;
  coachEmail: string;
  coachName?: string;
  /** Optional client data to pre-fill (from link token). */
  clientPrefill?: { firstName: string; lastName: string; email: string };
}

type SubmitState = 'idle' | 'sending' | 'sent' | 'error';

export function ClientFormView({ formId, formType, lang, coachEmail, coachName = '', clientPrefill }: ClientFormViewProps) {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'not_found'>('loading');
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [scale, setScale] = useState<FunctionalScale | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [scaleAnswers, setScaleAnswers] = useState<Record<string, number>>({});
  const [scaleClientDetails, setScaleClientDetails] = useState<{ firstName: string; lastName: string; email: string }>({ firstName: '', lastName: '', email: '' });
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!ALLOWED_IDS.has(formId)) {
      setLoadState('not_found');
      return;
    }
    const file = FILE_MAP[formId];
    fetch(`/data/${file}.json`)
      .then(r => r.json())
      .then((data: unknown) => {
        const d = data as Record<string, unknown>;
        if (formType === 'questionnaire' && d.type === 'form') {
          setQuestionnaire({ ...(d as Questionnaire), id: formId });
        } else if (formType === 'scale') {
          setScale({ ...(d as FunctionalScale), id: formId, type: 'scale' });
        } else {
          setLoadState('not_found');
          return;
        }
        setLoadState('ready');
      })
      .catch(() => setLoadState('not_found'));
  }, [formId, formType]);

  // Pre-fill trainer name when client opens form via share link (coach name or email from token)
  const trainerDisplayName = (coachName && coachName.trim()) || coachEmail || '';
  useEffect(() => {
    if (loadState !== 'ready' || formId !== 'parq' || !trainerDisplayName || !questionnaire) return;
    setAnswers(prev =>
      prev.parq_trainer_name !== undefined && prev.parq_trainer_name !== ''
        ? prev
        : { ...prev, parq_trainer_name: trainerDisplayName }
    );
  }, [loadState, formId, trainerDisplayName, questionnaire]);

  // Set today's date for readonly date fields (Consent date, Date completed) so they appear and are included in submit
  useEffect(() => {
    if (loadState !== 'ready' || !questionnaire) return;
    const today = new Date().toISOString().slice(0, 10);
    const updates: Record<string, string> = {};
    questionnaire.sections.forEach(section =>
      section.questions.forEach(q => {
        if (q.type === 'date' && (q as { default?: string }).default === 'today' && q.id) {
          updates[q.id] = today;
        }
      })
    );
    if (Object.keys(updates).length === 0) return;
    setAnswers(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(updates).forEach(([id, val]) => {
        if (prev[id] === undefined || prev[id] === '') {
          next[id] = val;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [loadState, questionnaire]);

  // Pre-fill client fields from link token (questionnaires: answers; scales: scaleClientDetails)
  useEffect(() => {
    if (loadState !== 'ready' || !clientPrefill) return;
    const { firstName, lastName, email } = clientPrefill;
    if (questionnaire && PREFILL_IDS[formId]) {
      const ids = PREFILL_IDS[formId];
      setAnswers(prev => ({
        ...prev,
        ...(firstName && { [ids.first]: firstName }),
        ...(lastName && { [ids.last]: lastName }),
        ...(email && { [ids.email]: email }),
      }));
    }
    if (scale && (firstName || lastName || email)) {
      setScaleClientDetails(prev => ({
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
        email: email || prev.email,
      }));
    }
  }, [loadState, formId, questionnaire, scale, clientPrefill]);

  const buildSummaryText = (): string => {
    if (questionnaire) {
      // Ensure readonly date fields (Date completed, Consent date) are always in the summary for the email
      const today = new Date().toISOString().slice(0, 10);
      const answersWithDates = { ...answers };
      questionnaire.sections.forEach(section =>
        section.questions.forEach(q => {
          if (q.type === 'date' && (q as { default?: string }).default === 'today' && q.id) {
            const v = answersWithDates[q.id];
            if (v === undefined || v === null || v === '') {
              answersWithDates[q.id] = today;
            }
          }
        })
      );
      return buildQuestionnaireSummary(questionnaire, answersWithDates, lang).text;
    }
    if (scale) {
      const lines: string[] = [
        `${getText(scale.name, lang)} (${scale.abbreviation})`,
        `Submitted: ${new Date().toLocaleString()}`,
        '',
      ];
      const ui = UI_STRINGS[lang];
      if (scaleClientDetails.firstName || scaleClientDetails.lastName || scaleClientDetails.email) {
        lines.push(`${ui.clientDetails}:`, `${ui.firstName}: ${scaleClientDetails.firstName || '—'}`, `${ui.lastName}: ${scaleClientDetails.lastName || '—'}`, `${ui.email}: ${scaleClientDetails.email || '—'}`, '');
      }
      let total = 0;
      scale.questions.forEach((q, i) => {
        const val = scaleAnswers[`q${i}`];
        const opt = scale.options.find(o => o.value === val);
        if (val != null) total += val;
        const optLabel = opt ? getText(opt.label, lang) : (lang === 'es' ? 'Sin responder' : 'Not answered');
        lines.push(`${i + 1}. ${getText(q, lang)}: ${opt ? `${optLabel} (${opt.value})` : optLabel}`);
      });
      lines.push('', `Total Score: ${total} / ${scale.maxScore}`);
      return lines.join('\n');
    }
    return '';
  };

  const handleSubmit = async () => {
    if (submitState === 'sending') return;
    setSubmitState('sending');
    setErrorMsg('');

    const summaryText = buildSummaryText();
    const formNameStr = questionnaire ? getText(questionnaire.name, lang) : scale ? getText(scale.name, lang) : formId;

    try {
      const res = await fetch('/api/send-form-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachEmail, formName: formNameStr, summaryText }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (json.ok) {
        setSubmitState('sent');
      } else {
        setErrorMsg(json.error ?? UI_STRINGS[lang].sendError);
        setSubmitState('error');
      }
    } catch {
      setErrorMsg(UI_STRINGS[lang].networkError);
      setSubmitState('error');
    }
  };

  // PAR-Q clearance notice (exclude parq_activity_level: Yes = active, not a risk)
  const showClearance = (() => {
    if (!questionnaire?.showClearanceNotice) return false;
    const yesNoIds = questionnaire.sections
      .flatMap(s => s.questions)
      .filter(q => q.type === 'yes_no' && q.id !== 'parq_activity_level')
      .map(q => q.id);
    return yesNoIds.some(id => answers[id] === 'Yes');
  })();

  const ui = UI_STRINGS[lang];

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">{ui.loading}</p>
      </div>
    );
  }

  if (loadState === 'not_found') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-slate-700 mb-2">{ui.invalidLink}</p>
          <p className="text-sm text-slate-400">{ui.invalidLinkHint}</p>
        </div>
      </div>
    );
  }

  if (submitState === 'sent') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl text-slate-900 mb-2">{ui.submitted}</h2>
          <p className="text-slate-500 text-sm">{ui.submittedHint}</p>
        </div>
      </div>
    );
  }

  const formNameDisplay = questionnaire ? getText(questionnaire.name, lang) : scale ? getText(scale.name, lang) : formId;

  const appHomeUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${APP_HOME_HASH}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <a
            href={appHomeUrl}
            className="flex items-center gap-3 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <img src="/images/logo.svg" alt="" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-medium">{APP_NAME}</span>
          </a>
          <div className="text-sm text-slate-500 mt-1">{formNameDisplay}</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {submitState === 'error' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {showClearance && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-yellow-700">{ui.clearance}</p>
          </div>
        )}

        {/* Overlay during sending */}
        <div className="relative">
          {questionnaire && (
            <FormQuestionnaire
              questionnaire={questionnaire}
              answers={answers}
              onAnswer={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))}
              onSubmit={handleSubmit}
              submitted={false}
              submitLabel={submitState === 'sending' ? ui.sending : ui.submit}
              lang={lang}
            />
          )}
          {scale && (
            <ScaleForm
              scale={scale}
              answers={scaleAnswers}
              onAnswer={(id, val) => setScaleAnswers(prev => ({ ...prev, [id]: val }))}
              onSubmit={handleSubmit}
              isSubmitting={submitState === 'sending'}
              lang={lang}
              ui={ui}
              clientDetails={scaleClientDetails}
              onClientDetailsChange={setScaleClientDetails}
            />
          )}
          {submitState === 'sending' && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
              <p className="text-slate-500 text-sm">{ui.sending}</p>
            </div>
          )}
        </div>

        {coachEmail && (
          <footer className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
            {ui.footer} <span className="font-medium text-slate-600">{coachEmail}</span> {lang === 'es' ? 'para que tu entrenador las revise.' : 'for your coach to review.'}
          </footer>
        )}
      </div>
    </div>
  );
}

// Standalone scale form renderer (FunctionalScales internal logic is not exported)
interface ScaleFormProps {
  scale: FunctionalScale;
  answers: Record<string, number>;
  onAnswer: (id: string, val: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  lang: FormLang;
  ui: typeof UI_STRINGS[FormLang];
  clientDetails: { firstName: string; lastName: string; email: string };
  onClientDetailsChange: (d: { firstName: string; lastName: string; email: string }) => void;
}

function ScaleForm({ scale, answers, onAnswer, onSubmit, isSubmitting, lang, ui, clientDetails, onClientDetailsChange }: ScaleFormProps) {
  const scaleDone = scale.questions.every((_, i) => answers[`q${i}`] !== undefined);
  const clientDone = clientDetails.firstName.trim() !== '' && clientDetails.lastName.trim() !== '' && clientDetails.email.trim() !== '';
  const allAnswered = scaleDone && clientDone;

  return (
    <div className="space-y-6">
      {/* Client details (required for share-by-link scales) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-slate-900 font-medium mb-4">{ui.clientDetails}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm text-slate-700 mb-1">{ui.firstName} *</label>
            <input
              type="text"
              value={clientDetails.firstName}
              onChange={e => onClientDetailsChange({ ...clientDetails, firstName: e.target.value })}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">{ui.lastName} *</label>
            <input
              type="text"
              value={clientDetails.lastName}
              onChange={e => onClientDetailsChange({ ...clientDetails, lastName: e.target.value })}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">{ui.email} *</label>
            <input
              type="email"
              value={clientDetails.email}
              onChange={e => onClientDetailsChange({ ...clientDetails, email: e.target.value })}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
            />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="space-y-6">
          {scale.questions.map((question, idx) => {
            const qId = `q${idx}`;
            return (
              <div key={idx} className="pb-6 border-b border-slate-200 last:border-0 last:pb-0">
                <div className="text-sm text-slate-700 mb-3">
                  {idx + 1}. {getText(question, lang)}
                </div>
                <div className="space-y-2">
                  {scale.options.map(option => (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={qId}
                        checked={answers[qId] === option.value}
                        onChange={() => onAnswer(qId, option.value)}
                        disabled={isSubmitting}
                        className="mt-1 w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-slate-700 flex-1">{getText(option.label, lang)}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">{ui.allRequired}</div>
        <button
          onClick={onSubmit}
          disabled={!allAnswered || isSubmitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? ui.sending : ui.submit}
        </button>
      </div>
    </div>
  );
}
