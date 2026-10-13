import React, { useEffect } from 'react';
import { ArrowLeft, BookOpen, Dumbbell, Target, AlertCircle, TrendingUp, Footprints } from 'lucide-react';
import type { Exercise, Pattern } from '../types';

interface ExerciseDetailProps {
  exercise: Exercise;
  onBack: () => void;
  allPatterns: Pattern[];
  onNavigateToPattern?: (id: string) => void;
  sectionLabel?: string;
}

export function ExerciseDetail({ exercise, onBack, allPatterns, onNavigateToPattern, sectionLabel = 'Exercise Library' }: ExerciseDetailProps) {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  // Find patterns that use this exercise
  const relatedPatterns = allPatterns.filter(pattern => 
    pattern.exercise_ids?.includes(exercise.id)
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
                Learn › {sectionLabel} › <span className="text-slate-900 font-medium">{exercise.name}</span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-white mb-2">{exercise.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4" />
                <span className="text-emerald-100">{exercise.target}</span>
              </div>
              <p className="text-emerald-100 leading-relaxed">
                {exercise.description}
              </p>
            </div>
          </div>

          {/* Reference */}
          {exercise.reference && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Reference: {exercise.reference}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Execution */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-slate-900 mb-4">Execution</h3>
              <ol className="space-y-3">
                {exercise.execution.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">
                      {idx + 1}
                    </span>
                    <span className="text-slate-600 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Coaching Cues */}
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
              <h3 className="text-slate-900 mb-4">Coaching Cues</h3>
              <div className="space-y-2">
                {exercise.cues.map((cue: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs">💡</span>
                    </div>
                    <span className="text-slate-700 leading-relaxed">{cue}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Errors */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="text-slate-900">Common Errors</h3>
              </div>
              <ul className="space-y-2">
                {exercise.common_errors.map((error: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Progressions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="text-slate-900">Progressions</h3>
              </div>
              <div className="space-y-3">
                {exercise.progressions.map((progression: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-emerald-600 flex-shrink-0 text-sm">
                      Level {idx + 1}
                    </span>
                    <span className="text-slate-600">{progression}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related Patterns */}
            {relatedPatterns.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Footprints className="w-5 h-5 text-blue-600" />
                  <h3 className="text-slate-900">Addresses Patterns</h3>
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

            {/* Quick Reference */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="text-slate-900 mb-4">Quick Reference</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-slate-500 mb-1">Target Muscles</div>
                  <div className="text-slate-900">{exercise.target}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Equipment</div>
                  <div className="text-slate-900">
                    {exercise.execution[0].toLowerCase().includes('band') ? 'Resistance Band' :
                     exercise.execution[0].toLowerCase().includes('weight') ? 'Weights' :
                     'Bodyweight'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Difficulty</div>
                  <div className="text-slate-900">
                    {exercise.progressions.length > 3 ? 'Progressive' : 'Beginner-Friendly'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
