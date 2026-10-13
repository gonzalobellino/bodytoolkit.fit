import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Filter, Grid3x3, List, Footprints, FileText, AlertTriangle, BookOpen, GraduationCap, Book, ChevronDown, ChevronUp, Dumbbell, Library } from 'lucide-react';
import { PatternDetail } from './PatternDetail';
import { AssessmentDetail } from './AssessmentDetail';
import { ExerciseDetail } from './ExerciseDetail';
import { ConditionDetail } from './ConditionDetail';
import type { Pattern, Assessment, ExercisesByCategory, Condition, Exercise, GlossaryTerms } from '../types';

type LearnTab = 'all' | 'patterns' | 'assessments' | 'exercises' | 'conditions' | 'glossary';

interface LearnSectionProps {
  onBack: () => void;
  patterns: Pattern[];
  assessments: Assessment[];
  exercises: ExercisesByCategory;
  conditions: Condition[];
  glossary: GlossaryTerms;
  initialTab?: LearnTab;
  initialItemId?: string;
}

type ViewMode = 'grid' | 'list';

interface GlossaryViewProps {
  glossary: GlossaryTerms;
  searchQuery: string;
}

function GlossaryView({ glossary, searchQuery }: GlossaryViewProps) {
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  const glossaryEntries = Object.entries(glossary)
    .map(([key, entry]) => ({ key, ...entry }))
    .filter(entry => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        entry.key.toLowerCase().includes(query) ||
        entry.term.toLowerCase().includes(query) ||
        entry.definition.toLowerCase().includes(query) ||
        entry.bodyParts.some(bp => bp.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => a.term.localeCompare(b.term));

  const groupedByLetter = glossaryEntries.reduce((acc, entry) => {
    const firstLetter = entry.term[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(entry);
    return acc;
  }, {} as Record<string, typeof glossaryEntries>);

  const letters = Object.keys(groupedByLetter).sort();

  if (glossaryEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <Book className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No terms found matching &quot;{searchQuery}&quot;</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-center bg-white rounded-xl p-4 border border-slate-200">
        {letters.map(letter => (
          <a
            key={letter}
            href={`#glossary-${letter}`}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
          >
            {letter}
          </a>
        ))}
      </div>

      {letters.map(letter => (
        <div key={letter} id={`glossary-${letter}`} className="scroll-mt-24">
          <h3 className="text-xl font-semibold text-slate-900 mb-4 sticky top-20 bg-slate-50 py-2 z-10">
            {letter}
          </h3>
          <div className="space-y-3">
            {groupedByLetter[letter].map(entry => (
              <div
                key={entry.key}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedTerm(expandedTerm === entry.key ? null : entry.key)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {entry.key}
                    </span>
                    <span className="font-medium text-slate-900">{entry.term}</span>
                  </div>
                  {expandedTerm === entry.key ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                {expandedTerm === entry.key && (
                  <div className="px-6 pb-4 text-slate-700 space-y-2">
                    <div>{entry.definition}</div>
                    {entry.bodyParts.length > 0 && (
                      <div className="text-sm text-slate-500">
                        Body Parts: {entry.bodyParts.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
export function LearnSection({ onBack, patterns, assessments, exercises, conditions, glossary, initialTab, initialItemId }: LearnSectionProps) {
  // Flatten exercises from grouped structure
  const allExercises = Object.values(exercises).flatMap(group => group);
  const [activeTab, setActiveTab] = useState<LearnTab>(initialTab ?? 'all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null);

  // Open the specific item when navigating from search
  useEffect(() => {
    if (initialItemId && initialTab) {
      if (initialTab === 'patterns') setSelectedPatternId(initialItemId);
      else if (initialTab === 'assessments') setSelectedAssessmentId(initialItemId);
      else if (initialTab === 'exercises') setSelectedExerciseId(initialItemId);
      else if (initialTab === 'conditions') setSelectedConditionId(initialItemId);
    }
  }, [initialTab, initialItemId]);

  const selectedPattern = selectedPatternId 
    ? patterns.find(p => p.id === selectedPatternId)
    : null;

  const selectedAssessment = selectedAssessmentId 
    ? assessments.find(a => a.id === selectedAssessmentId)
    : null;

  const selectedExercise = selectedExerciseId 
    ? allExercises.find(e => e.id === selectedExerciseId)
    : null;

  const selectedCondition = selectedConditionId 
    ? conditions.find(c => c.id === selectedConditionId)
    : null;

  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = pattern.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredConditions = conditions.filter(condition => {
    const matchesSearch = condition.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredExercisesBySection = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const query = searchQuery.toLowerCase();
    const result: ExercisesByCategory = {};
    for (const [section, exs] of Object.entries(exercises)) {
      const filtered = exs.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        (ex.description?.toLowerCase().includes(query)) ||
        (ex.target?.toLowerCase().includes(query))
      );
      if (filtered.length > 0) result[section] = filtered;
    }
    return result;
  }, [exercises, searchQuery]);

  // Global search results for "All" tab - grouped by type
  const globalSearchResults = useMemo(() => {
    if (activeTab !== 'all' || !searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    const matchedPatterns = patterns.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.overview?.toLowerCase().includes(query)
    );
    const matchedAssessments = assessments.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.description?.toLowerCase().includes(query)
    );
    const matchedExercises = allExercises.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.description?.toLowerCase().includes(query) ||
      e.target?.toLowerCase().includes(query)
    );
    const matchedConditions = conditions.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.overview?.toLowerCase().includes(query)
    );
    const glossaryEntries = Object.entries(glossary)
      .map(([key, entry]) => ({ key, ...entry }))
      .filter(entry =>
        entry.term.toLowerCase().includes(query) ||
        entry.definition.toLowerCase().includes(query) ||
        entry.bodyParts.some((bp: string) => bp.toLowerCase().includes(query))
      );
    return {
      patterns: matchedPatterns,
      assessments: matchedAssessments,
      exercises: matchedExercises,
      conditions: matchedConditions,
      glossary: glossaryEntries
    };
  }, [activeTab, searchQuery, patterns, assessments, allExercises, conditions, glossary]);

  if (selectedPattern) {
    return (
      <PatternDetail
        pattern={selectedPattern}
        onBack={() => setSelectedPatternId(null)}
        allExercises={allExercises}
        allAssessments={assessments}
        onNavigateToExercise={(id) => {
          setSelectedPatternId(null);
          setSelectedExerciseId(id);
        }}
        onNavigateToAssessment={(id) => {
          setSelectedPatternId(null);
          setSelectedAssessmentId(id);
        }}
      />
    );
  }

  if (selectedAssessment) {
    return (
      <AssessmentDetail
        assessment={selectedAssessment}
        onBack={() => setSelectedAssessmentId(null)}
        allPatterns={patterns}
        onNavigateToPattern={(id) => {
          setSelectedAssessmentId(null);
          setSelectedPatternId(id);
        }}
      />
    );
  }

  if (selectedExercise) {
    return (
      <ExerciseDetail
        exercise={selectedExercise}
        onBack={() => setSelectedExerciseId(null)}
        allPatterns={patterns}
        onNavigateToPattern={(id) => {
          setSelectedExerciseId(null);
          setSelectedPatternId(id);
        }}
      />
    );
  }

  if (selectedCondition) {
    return (
      <ConditionDetail
        condition={selectedCondition}
        onBack={() => setSelectedConditionId(null)}
        allExercises={allExercises}
        allAssessments={assessments}
        onNavigateToExercise={(id) => {
          setSelectedConditionId(null);
          setSelectedExerciseId(id);
        }}
        onNavigateToAssessment={(id) => {
          setSelectedConditionId(null);
          setSelectedAssessmentId(id);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <div className="text-slate-900">Learn</div>
                <div className="text-xs text-slate-500">Reference Library</div>
              </div>
            </div>
            {activeTab !== 'all' && activeTab !== 'glossary' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 relative whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Library className="w-4 h-4" />
                <span>All</span>
              </div>
              {activeTab === 'all' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`px-6 py-4 relative whitespace-nowrap transition-colors ${
                activeTab === 'patterns'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4" />
                <span>Movement Patterns</span>
              </div>
              {activeTab === 'patterns' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('assessments')}
              className={`px-6 py-4 relative whitespace-nowrap transition-colors ${
                activeTab === 'assessments'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Assessments</span>
              </div>
              {activeTab === 'assessments' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('exercises')}
              className={`px-6 py-4 relative whitespace-nowrap transition-colors ${
                activeTab === 'exercises'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                <span>Exercise Library</span>
              </div>
              {activeTab === 'exercises' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('conditions')}
              className={`px-6 py-4 relative whitespace-nowrap transition-colors ${
                activeTab === 'conditions'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Conditions & Red Flags</span>
              </div>
              {activeTab === 'conditions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('glossary')}
              className={`px-6 py-4 relative whitespace-nowrap transition-colors ${
                activeTab === 'glossary'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Book className="w-4 h-4" />
                <span>Glossary</span>
              </div>
              {activeTab === 'glossary' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'all' ? 'Search entire library...' : `Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors">
              <Filter className="w-5 h-5 text-slate-600" />
              <span className="text-slate-900">Filters</span>
            </button>
          </div>
        </div>

        {/* All tab: overview when no search, global results when searching */}
        {activeTab === 'all' && (
          <>
            {!searchQuery.trim() ? (
              <div className="space-y-8">
                <p className="text-slate-600 mb-6">
                  Browse by section or start typing to search across the entire library.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('patterns')}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <Footprints className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="font-medium text-slate-900 group-hover:text-blue-600">Movement Patterns</span>
                    </div>
                    <p className="text-sm text-slate-600">{patterns.length} patterns</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('assessments')}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-violet-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-violet-600" />
                      </div>
                      <span className="font-medium text-slate-900 group-hover:text-violet-600">Assessments</span>
                    </div>
                    <p className="text-sm text-slate-600">{assessments.length} assessments</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('exercises')}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                        <Dumbbell className="w-6 h-6 text-emerald-600" />
                      </div>
                      <span className="font-medium text-slate-900 group-hover:text-emerald-600">Exercise Library</span>
                    </div>
                    <p className="text-sm text-slate-600">{allExercises.length} exercises</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('conditions')}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className="font-medium text-slate-900 group-hover:text-amber-600">Conditions & Red Flags</span>
                    </div>
                    <p className="text-sm text-slate-600">{conditions.length} conditions</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('glossary')}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <Book className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="font-medium text-slate-900 group-hover:text-blue-600">Glossary</span>
                    </div>
                    <p className="text-sm text-slate-600">{Object.keys(glossary).length} terms</p>
                  </button>
                </div>
              </div>
            ) : globalSearchResults ? (
              <div className="space-y-8">
                {globalSearchResults.patterns.length === 0 &&
                  globalSearchResults.assessments.length === 0 &&
                  globalSearchResults.exercises.length === 0 &&
                  globalSearchResults.conditions.length === 0 &&
                  globalSearchResults.glossary.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No results found for &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  <>
                    {globalSearchResults.patterns.length > 0 && (
                      <div>
                        <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
                          <Footprints className="w-5 h-5 text-blue-600" />
                          Movement Patterns ({globalSearchResults.patterns.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {globalSearchResults.patterns.map((pattern) => (
                            <div
                              key={pattern.id}
                              onClick={() => setSelectedPatternId(pattern.id)}
                              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="font-medium text-slate-900 group-hover:text-blue-600 truncate">{pattern.name}</span>
                                <Footprints className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                              </div>
                              <p className="text-sm text-slate-600 line-clamp-2">{pattern.overview ?? pattern.description ?? ''}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {globalSearchResults.assessments.length > 0 && (
                      <div>
                        <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-violet-600" />
                          Assessments ({globalSearchResults.assessments.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {globalSearchResults.assessments.map((assessment) => (
                            <div
                              key={assessment.id}
                              onClick={() => setSelectedAssessmentId(assessment.id)}
                              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-violet-300 transition-all cursor-pointer group"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="font-medium text-slate-900 group-hover:text-violet-600 truncate">{assessment.name}</span>
                                <FileText className="w-5 h-5 text-violet-600 flex-shrink-0 ml-2" />
                              </div>
                              <p className="text-sm text-slate-600 line-clamp-2">{assessment.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {globalSearchResults.exercises.length > 0 && (
                      <div>
                        <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
                          <Dumbbell className="w-5 h-5 text-emerald-600" />
                          Exercises ({globalSearchResults.exercises.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {globalSearchResults.exercises.map((exercise) => (
                            <div
                              key={exercise.id}
                              onClick={() => setSelectedExerciseId(exercise.id)}
                              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer group"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="font-medium text-slate-900 group-hover:text-emerald-600 truncate">{exercise.name}</span>
                                <Dumbbell className="w-5 h-5 text-emerald-600 flex-shrink-0 ml-2" />
                              </div>
                              <p className="text-sm text-slate-600 line-clamp-2">{exercise.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {globalSearchResults.conditions.length > 0 && (
                      <div>
                        <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          Conditions ({globalSearchResults.conditions.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {globalSearchResults.conditions.map((condition) => (
                            <div
                              key={condition.id}
                              onClick={() => setSelectedConditionId(condition.id)}
                              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer group"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="font-medium text-slate-900 group-hover:text-amber-600 truncate">{condition.name}</span>
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 ml-2" />
                              </div>
                              <p className="text-sm text-slate-600 line-clamp-2">{condition.overview}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {globalSearchResults.glossary.length > 0 && (
                      <div>
                        <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
                          <Book className="w-5 h-5 text-blue-600" />
                          Glossary ({globalSearchResults.glossary.length})
                        </h3>
                        <div className="space-y-2">
                          {globalSearchResults.glossary.map((entry: { key: string; term: string; definition: string }) => (
                            <button
                              key={entry.key}
                              onClick={() => {
                                setActiveTab('glossary');
                                setSearchQuery(entry.term);
                              }}
                              className="w-full bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all text-left"
                            >
                              <span className="font-medium text-slate-900">{entry.term}</span>
                              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{entry.definition}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </>
        )}

        {/* Pattern Cards */}
        {activeTab === 'patterns' && viewMode === 'grid' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatterns.map((pattern) => (
              <div
                key={pattern.id}
                onClick={() => setSelectedPatternId(pattern.id)}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {pattern.name}
                    </div>
                    <div className="text-xs text-slate-500">{pattern.category}</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <Footprints className="w-5 h-5 text-blue-600" />
                  </div>
                </div>

                {pattern.evidence?.description && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs text-emerald-700">
                        Evidence Available
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {pattern.overview ?? pattern.description ?? ''}
                </p>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    {pattern.exercise_ids?.length ?? 0} exercises • {pattern.assessment_ids?.length ?? 0} assessments
                  </div>
                  <span className="text-blue-600 text-sm">View →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assessments Cards */}
        {activeTab === 'assessments' && viewMode === 'grid' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment) => (
              <div
                key={assessment.id}
                onClick={() => setSelectedAssessmentId(assessment.id)}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {assessment.name}
                    </div>
                    <div className="text-xs text-slate-500">{assessment.category}</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-violet-600" />
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-4">
                  {assessment.description}
                </p>

                <div className="space-y-2">
                  <div className="text-xs text-slate-500">Views:</div>
                  <div className="flex flex-wrap gap-1">
                    {assessment.views.map((view, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-violet-50 text-violet-700 rounded"
                      >
                        {view}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conditions Cards */}
        {activeTab === 'conditions' && viewMode === 'grid' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConditions.map((condition) => (
              <div
                key={condition.id}
                onClick={() => setSelectedConditionId(condition.id)}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-slate-900 mb-1 group-hover:text-amber-600 transition-colors">
                      {condition.name}
                    </div>
                    <div className="text-xs text-slate-500">{condition.category}</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {condition.overview}
                </p>

                {condition.red_flags?.length && condition.red_flags.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-red-600 mb-2">Red Flags:</div>
                    <div className="flex flex-wrap gap-1">
                      {condition.red_flags.slice(0, 2).map((flag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded"
                        >
                          {flag}
                        </span>
                      ))}
                      {condition.red_flags.length > 2 && (
                        <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">
                          +{condition.red_flags.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <div className="text-sm text-slate-600">
                    {condition.exercise_ids?.length ?? 0} corrective exercises
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Exercises */}
        {activeTab === 'exercises' && (
          <div className="space-y-8">
            {Object.keys(filteredExercisesBySection).length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No exercises found matching &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              Object.entries(filteredExercisesBySection).map(([section, sectionExercises]) => (
                <div key={section}>
                  <h3 className="text-slate-900 mb-4 capitalize">{section.replace(/_/g, ' ')}</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectionExercises.map((exercise: Exercise) => (
                    <div
                      key={exercise.id}
                      onClick={() => setSelectedExerciseId(exercise.id)}
                      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors truncate">
                            {exercise.name}
                          </div>
                          <div className="text-xs text-slate-500">{exercise.target}</div>
                        </div>
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center ml-3">
                          <Dumbbell className="w-5 h-5 text-emerald-600" />
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {exercise.description}
                      </p>
                    </div>
                  ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Glossary */}
        {activeTab === 'glossary' && (
          <GlossaryView glossary={glossary} searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}
