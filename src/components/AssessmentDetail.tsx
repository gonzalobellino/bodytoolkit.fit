import React, { useEffect } from 'react';
import { ArrowLeft, FileText, Eye, Target, BookOpen, Footprints } from 'lucide-react';
import type { Assessment, Pattern } from '../types';

interface AssessmentDetailProps {
  assessment: Assessment;
  onBack: () => void;
  allPatterns: Pattern[];
  onNavigateToPattern?: (id: string) => void;
  sectionLabel?: string;
}

export function AssessmentDetail({ assessment, onBack, allPatterns, onNavigateToPattern, sectionLabel = 'Assessments' }: AssessmentDetailProps) {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  // Find patterns that use this assessment
  const relatedPatterns = allPatterns.filter(pattern => 
    pattern.assessment_ids?.includes(assessment.id)
  );

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
                Learn › {sectionLabel} › <span className="text-slate-900 font-medium">{assessment.name}</span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-white mb-2">{assessment.name}</h1>
              <p className="text-violet-100 leading-relaxed">
                {assessment.description}
              </p>
            </div>
          </div>

          {/* Reference */}
          {assessment.reference && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Reference: {assessment.reference}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Purpose */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-violet-600" />
                <h3 className="text-slate-900">Purpose</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {assessment.purpose}
              </p>
            </div>

            {/* Execution Steps */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Execution</h3>
              <ol className="space-y-3">
                {assessment.execution.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-sm">
                      {idx + 1}
                    </span>
                    <span className="text-slate-600 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Key Observations */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Key Observations</h3>
              <ul className="space-y-2">
                {assessment.key_observations.map((obs: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2"></div>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Positive Indicators */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <h3 className="text-slate-900 mb-4">Positive Indicators (Dysfunction)</h3>
              <div className="space-y-3">
                {Object.entries(assessment.positive_indicators).map(([view, indicator]) => (
                  <div key={view} className="border-l-4 border-amber-500 pl-4">
                    <div className="text-sm text-amber-900 mb-1 capitalize">{view} View:</div>
                    <div className="text-slate-700">{indicator}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Protocol */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Protocol</h3>
              <ul className="space-y-2">
                {assessment.protocol.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Views */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-violet-600" />
                <h3 className="text-slate-900">Assessment Views</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {assessment.views.map((view: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg border border-violet-200 capitalize"
                  >
                    {view}
                  </span>
                ))}
              </div>
            </div>

            {/* Related Patterns */}
            {relatedPatterns.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Footprints className="w-5 h-5 text-blue-600" />
                  <h3 className="text-slate-900">Used in Patterns</h3>
                </div>
                <div className="space-y-2">
                  {relatedPatterns.map((pattern) => (
                    <div
                      key={pattern.id}
                      onClick={() => onNavigateToPattern?.(pattern.id)}
                      className="p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <div className="text-sm text-slate-900">{pattern.name}</div>
                      <div className="text-xs text-slate-600">{pattern.category}</div>
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
