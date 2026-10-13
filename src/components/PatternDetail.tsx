import React, { useEffect } from 'react';
import { ArrowLeft, Footprints, BookOpen, FileText, AlertTriangle, GraduationCap, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import type { Pattern, Exercise, Assessment } from '../types';

interface PatternDetailProps {
  pattern: Pattern;
  onBack: () => void;
  allExercises: Exercise[];
  allAssessments: Assessment[];
  onNavigateToExercise?: (id: string) => void;
  onNavigateToAssessment?: (id: string) => void;
  sectionLabel?: string;
}

export function PatternDetail({ pattern, onBack, allExercises, allAssessments, onNavigateToExercise, onNavigateToAssessment, sectionLabel = 'Movement Patterns' }: PatternDetailProps) {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const relatedExercises = allExercises.filter(ex => 
    pattern.exercise_ids?.includes(ex.id)
  );
  
  const relatedAssessments = allAssessments.filter(ass => 
    pattern.assessment_ids?.includes(ass.id)
  );
  const evidenceSources = (pattern.evidence?.sources ?? []).map((source) => {
    if (typeof source === 'string') {
      return { title: source, type: undefined, url: undefined, doi_url: undefined };
    }
    return { 
      title: (source as { title?: string }).title ?? '', 
      type: (source as { type?: string }).type, 
      url: (source as { url?: string }).url, 
      doi_url: (source as { doi_url?: string }).doi_url 
    };
  });
  const evidenceText = pattern.evidence?.summary ?? pattern.evidence?.description;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <nav className="text-sm text-slate-600 truncate" aria-label="Breadcrumb">
                Learn › {sectionLabel} › <span className="text-slate-900 font-medium">{pattern.name}</span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Footprints className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-white mb-2">{pattern.name}</h1>
              <p className="text-blue-100 leading-relaxed">
                {pattern.overview ?? pattern.description ?? ''}
              </p>
            </div>
          </div>

          {/* Evidence Badge */}
          {pattern.evidence && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5" />
                <span>Scientific Evidence{pattern.evidence.level ? `: ${pattern.evidence.level}` : ''}</span>
              </div>
              {evidenceText && (
                <p className="text-sm text-blue-100">
                  {evidenceText}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Biomechanics */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Biomechanical Mechanism</h3>
              <p className="text-slate-600 leading-relaxed">
                {pattern.biomechanical_mechanism}
              </p>
            </div>

            {/* Clinical Rationale */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Clinical Rationale</h3>
              <p className="text-slate-600 leading-relaxed">
                {pattern.clinical_rationale}
              </p>
            </div>

            {/* Practical Solution */}
            {pattern.practical_solution && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
                <h3 className="text-slate-900 mb-4">Practical Solution</h3>
                <p className="text-slate-700 leading-relaxed">
                  {pattern.practical_solution}
                </p>
              </div>
            )}

            {/* Common Compensations */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Common Compensations</h3>
              <ul className="space-y-2">
                {pattern.common_compensations.map((comp: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
                    <span>{comp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Progression & Regression */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-slate-900">Progression</h3>
                </div>
                <ol className="space-y-2">
                  {pattern.progression.map((step: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-600 text-sm">
                      <span className="text-emerald-600 flex-shrink-0">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5 text-blue-600" />
                  <h3 className="text-slate-900">Regression</h3>
                </div>
                <ul className="space-y-2">
                  {pattern.regression.map((step: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-600 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Scientific Evidence */}
            {pattern.evidence?.sources?.length ? (
              <div className="bg-white rounded-xl border border-emerald-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-slate-900">Research Evidence</h3>
                </div>
                <div className="space-y-4">
                  {evidenceSources.map((source, idx) => (
                    <div key={idx} className="border-l-4 border-emerald-500 pl-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <p className="text-slate-900 text-sm leading-relaxed mb-1">
                            {source?.title}
                          </p>
                          <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                            {source?.type ?? 'Study'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs">
                        {source?.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            PubMed
                          </a>
                        )}
                        {source?.doi_url && (
                          <a
                            href={source.doi_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            DOI
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Red Flags */}
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-slate-900">Red Flags</h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Refer to medical professional if present:
              </p>
              <ul className="space-y-2">
                {pattern.red_flags.map((flag: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Differential Diagnosis */}
            {pattern.differential_diagnosis && pattern.differential_diagnosis.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-slate-900 mb-4">Differential Diagnosis</h3>
                <div className="flex flex-wrap gap-2">
                  {pattern.differential_diagnosis.map((diagnosis: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200"
                    >
                      {diagnosis}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Assessments */}
            {relatedAssessments.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-violet-600" />
                  <h3 className="text-slate-900">Related Assessments</h3>
                </div>
                <div className="space-y-2">
                  {relatedAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      onClick={() => onNavigateToAssessment?.(assessment.id)}
                      className="p-3 rounded-lg bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors cursor-pointer"
                    >
                      <div className="text-sm text-slate-900">{assessment.name}</div>
                      <div className="text-xs text-slate-600">{assessment.category}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Exercises */}
            {relatedExercises.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="text-slate-900">Corrective Exercises</h3>
                </div>
                <div className="space-y-2">
                  {relatedExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      onClick={() => onNavigateToExercise?.(exercise.id)}
                      className="p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <div className="text-sm text-slate-900">{exercise.name}</div>
                      <div className="text-xs text-slate-600">{exercise.target}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
