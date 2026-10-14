import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { loadAllData } from './utils/dataLoader';
import { PremiumProvider } from './contexts/PremiumContext';
import type { Pattern, Assessment, ExercisesByCategory, Condition, GlossaryTerms, QuizQuestionsByTopic, QuizTopic, Questionnaire, FunctionalScale, FormLang } from './types';

// Lazy load components for code splitting
const HomePage = lazy(() => import('./components/HomePage').then(m => ({ default: m.HomePage })));
const LearnSection = lazy(() => import('./components/LearnSection').then(m => ({ default: m.LearnSection })));
const PracticeSection = lazy(() => import('./components/PracticeSection').then(m => ({ default: m.PracticeSection })));
const FieldToolsSection = lazy(() => import('./components/FieldToolsSection').then(m => ({ default: m.FieldToolsSection })));
const AboutPage = lazy(() => import('./components/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./components/ContactPage').then(m => ({ default: m.ContactPage })));
const LegalPage = lazy(() => import('./components/LegalPage').then(m => ({ default: m.LegalPage })));
const Footer = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));
const ClientFormView = lazy(() => import('./components/ClientFormView').then(m => ({ default: m.ClientFormView })));

export type MainSection = 'home' | 'learn' | 'practice' | 'field' | 'about' | 'contact' | 'legal';
export type LearnTab = 'all' | 'patterns' | 'assessments' | 'exercises' | 'conditions' | 'glossary';

function parseHash(hash: string): { section: MainSection; tab?: LearnTab; itemId?: string } {
  const learnMatch = hash.match(/^#\/learn\/(patterns|assessments|exercises|conditions)\/(.+)/);
  if (learnMatch) return { section: 'learn', tab: learnMatch[1] as LearnTab, itemId: learnMatch[2] };
  if (hash.startsWith('#/about')) return { section: 'about' };
  if (hash.startsWith('#/field')) return { section: 'field' };
  return { section: 'home' };
}

function parsePath(pathname: string): { section: MainSection; tab?: LearnTab; itemId?: string } {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const learnMatch = normalized.match(/^\/learn\/(patterns|assessments|exercises|conditions)\/(.+)/);
  if (learnMatch) return { section: 'learn', tab: learnMatch[1] as LearnTab, itemId: learnMatch[2] };
  if (normalized === '/about') return { section: 'about' };
  if (normalized === '/field') return { section: 'field' };
  return { section: 'home' };
}

import { MuscleChartsData } from './utils/dataLoader';

interface AppData {
  patterns: Pattern[];
  assessments: Assessment[];
  exercises: ExercisesByCategory;
  conditions: Condition[];
  glossary: GlossaryTerms;
  quizQuestions: QuizQuestionsByTopic;
  quizTopics: QuizTopic[];
  questionnaires: Record<string, Questionnaire>;
  functionalScales: Record<string, FunctionalScale>;
  muscleCharts: MuscleChartsData | null;
}

export default function App() {
  // Sync hash so client form route updates when user navigates (e.g. header link to #/)
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Detect client form route from URL hash
  const clientFormRoute = useMemo(() => {
    const match = hash.match(/^#\/form\/([^?&]+)/);
    if (!match) return null;
    const formId = match[1];
    const queryStr = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    const params = new URLSearchParams(queryStr);
    const formType = params.get('t') ?? 'questionnaire';
    const lang: FormLang = params.get('lang') === 'es' ? 'es' : 'en';
    const cParam = params.get('c') ?? '';
    try {
      const decoded = decodeURIComponent(atob(cParam));
      const obj = JSON.parse(decoded) as { e?: string; n?: string; fn?: string; ln?: string; em?: string };
      if (obj && typeof obj.e === 'string' && obj.e && formId) {
        const coachName = (obj.n && obj.n.trim()) || '';
        const clientPrefill =
          (obj.fn || obj.ln || obj.em)
            ? {
                firstName: (obj.fn && obj.fn.trim()) || '',
                lastName: (obj.ln && obj.ln.trim()) || '',
                email: (obj.em && obj.em.trim()) || '',
              }
            : undefined;
        return { formId, formType, lang, coachEmail: obj.e, coachName, clientPrefill };
      }
    } catch {
      // try legacy: plain email in base64
    }
    try {
      const coachEmail = atob(cParam);
      if (coachEmail && formId) return { formId, formType, lang, coachEmail, coachName: '', clientPrefill: undefined };
    } catch {
      // invalid base64
    }
    return null;
  }, [hash]);

  const initialRoute = useMemo(() => {
    const r = parseHash(window.location.hash);
    return r.section !== 'home' ? r : parsePath(window.location.pathname);
  }, []);
  const [currentSection, setCurrentSection] = useState<MainSection>(initialRoute.section);
  const [initialLearnTab, setInitialLearnTab] = useState<LearnTab | undefined>(initialRoute.tab);
  const [initialLearnItemId, setInitialLearnItemId] = useState<string | undefined>(initialRoute.itemId);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  const SECTION_TITLES: Record<MainSection, string> = {
    home: 'Corrective Exercise Toolkit — AI Video Analysis & Movement Assessment',
    learn: 'Library — Corrective Exercise Toolkit',
    practice: 'Practice — Corrective Exercise Toolkit',
    field: 'Field Tools — Corrective Exercise Toolkit',
    about: 'About — Corrective Exercise Toolkit',
    contact: 'Contact — Corrective Exercise Toolkit',
    legal: 'Legal — Corrective Exercise Toolkit',
  };

  // Navigation handler that supports optional learn tab and item to open
  const handleNavigate = (section: MainSection, learnTab?: LearnTab, learnItemId?: string) => {
    setCurrentSection(section);
    setInitialLearnTab(section === 'learn' ? learnTab : undefined);
    setInitialLearnItemId(section === 'learn' ? learnItemId : undefined);
    document.title = SECTION_TITLES[section];
  };

  useEffect(() => {
    async function initializeData() {
      try {
        const loadedData = await loadAllData();
        setData(loadedData as AppData);
      } catch (error) {
        console.error('Failed to load application data:', error);
      } finally {
        setLoading(false);
      }
    }
    initializeData();
  }, []);

  useEffect(() => {
    if (clientFormRoute) return;
    const route = parseHash(hash);
    if (route.section !== currentSection) {
      handleNavigate(route.section, route.tab, route.itemId);
    }
  }, [hash, clientFormRoute]);

  // Client form route — render standalone, no app data needed
  if (clientFormRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      }>
        <ClientFormView
          formId={clientFormRoute.formId}
          formType={clientFormRoute.formType}
          lang={clientFormRoute.lang}
          coachEmail={clientFormRoute.coachEmail}
          coachName={clientFormRoute.coachName}
          clientPrefill={clientFormRoute.clientPrefill}
        />
      </Suspense>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-600 text-lg mb-2">Loading...</div>
          <div className="text-slate-400 text-sm">Loading application data</div>
        </div>
      </div>
    );
  }

  const LoadingFallback = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-slate-600 text-lg mb-2">Loading...</div>
        <div className="text-slate-400 text-sm">Loading component</div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 'home':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <div>
              <HomePage 
                onNavigate={handleNavigate}
                patterns={data.patterns}
                assessments={data.assessments}
                exercises={data.exercises}
                conditions={data.conditions}
                glossary={data.glossary}
              />
              <Footer onNavigate={handleNavigate} />
            </div>
          </Suspense>
        );
      case 'learn':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LearnSection 
              onBack={() => handleNavigate('home')}
              patterns={data.patterns}
              assessments={data.assessments}
              exercises={data.exercises}
              conditions={data.conditions}
              glossary={data.glossary}
              initialTab={initialLearnTab}
              initialItemId={initialLearnItemId}
            />
          </Suspense>
        );
      case 'practice':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <PracticeSection 
              onBack={() => setCurrentSection('home')}
              quizQuestions={data.quizQuestions}
              quizTopics={data.quizTopics}
              patterns={data.patterns}
              assessments={data.assessments}
              exercises={data.exercises}
              muscleCharts={data.muscleCharts}
            />
          </Suspense>
        );
      case 'field':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <FieldToolsSection 
              onBack={() => setCurrentSection('home')} 
              questionnaires={data.questionnaires}
              functionalScales={data.functionalScales}
            />
          </Suspense>
        );
      case 'about':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AboutPage onBack={() => setCurrentSection('home')} />
          </Suspense>
        );
      case 'contact':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ContactPage onBack={() => setCurrentSection('home')} />
          </Suspense>
        );
      case 'legal':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LegalPage onBack={() => setCurrentSection('home')} />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <div>
              <HomePage 
                onNavigate={handleNavigate}
                patterns={data.patterns}
                assessments={data.assessments}
                exercises={data.exercises}
                conditions={data.conditions}
                glossary={data.glossary}
              />
              <Footer onNavigate={handleNavigate} />
            </div>
          </Suspense>
        );
    }
  };

  return (
    <PremiumProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {renderSection()}
      </div>
    </PremiumProvider>
  );
}
