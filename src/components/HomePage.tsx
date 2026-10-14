import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BookOpen, Brain, Wrench, Search, Menu, Crown, Footprints, FileText, Dumbbell, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MainSection, LearnTab } from '../App';
import type { Pattern, Assessment, ExercisesByCategory, Condition, GlossaryTerms } from '../types';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { usePWAInstall } from '../hooks/usePWAInstall';

type SectionKey = 'learn' | 'practice' | 'field';

const CARD_DESCRIPTIONS: Record<SectionKey, string> = {
  learn: 'Explore movement patterns, biomechanics, assessment protocols, and corrective strategies. Navigate interconnected content with smart filtering.',
  practice: 'Test your knowledge with quizzes and dynamic evaluations. Practice identifying movement patterns and selecting appropriate exercises.',
  field: 'Capture and analyze in real-time. Video/photo analysis, visual assessment scales, questionnaires, and documentation tools.'
};

interface SearchResult {
  id: string;
  name: string;
  type: 'pattern' | 'assessment' | 'exercise' | 'condition';
  category?: string;
}

interface HomePageProps {
  onNavigate: (section: MainSection, learnTab?: LearnTab, learnItemId?: string) => void;
  patterns: Pattern[];
  assessments: Assessment[];
  exercises: ExercisesByCategory;
  conditions: Condition[];
  glossary: GlossaryTerms;
}

export function HomePage({ onNavigate, patterns, assessments, exercises, conditions, glossary }: HomePageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileCardExpanded, setMobileCardExpanded] = useState<Record<SectionKey, boolean>>({
    learn: false,
    practice: false,
    field: false
  });
  const [statsIndex, setStatsIndex] = useState(0);
  const [sectionsIndex, setSectionsIndex] = useState(0);
  const [desktopOverviewIndex, setDesktopOverviewIndex] = useState(0);
  const statsTouchStart = useRef<number | null>(null);
  const sectionsTouchStart = useRef<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const {
    isInstallable,
    isInstalled,
    promptInstall,
    installLabel,
    showInstallNotice,
    dismissInstallNotice,
    debugInfo,
    refreshDebugInfo,
    unregisterServiceWorkers
  } = usePWAInstall();
  const showPwaDebug = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).has('pwaDebug')
    : false;
  
  // Calculate stats from actual data
  const totalPatterns = patterns.length;
  const totalExercises = Object.values(exercises).flat().length;
  const totalAssessments = assessments.length;
  const totalConditions = conditions.length;
  const totalGlossary = Object.keys(glossary ?? {}).length;
  const overviewCards: Array<{
    id: 'patterns' | 'exercises' | 'assessments' | 'conditions' | 'glossary';
    label: string;
    value: number;
    description: string;
    colorClass: string;
  }> = [
    {
      id: 'patterns',
      label: 'Movement Patterns',
      value: totalPatterns,
      description: 'Library of movement findings',
      colorClass: 'text-blue-600'
    },
    {
      id: 'exercises',
      label: 'Exercises',
      value: totalExercises,
      description: 'Interventions and drills',
      colorClass: 'text-indigo-600'
    },
    {
      id: 'assessments',
      label: 'Assessments',
      value: totalAssessments,
      description: 'Testing protocols',
      colorClass: 'text-violet-600'
    },
    {
      id: 'conditions',
      label: 'Conditions',
      value: totalConditions,
      description: 'Red flags & pathology',
      colorClass: 'text-purple-600'
    },
    {
      id: 'glossary',
      label: 'Glossary',
      value: totalGlossary,
      description: 'Terminology reference',
      colorClass: 'text-blue-600'
    }
  ];
  const overviewDesktopSlides = useMemo(() => {
    const chunks: typeof overviewCards[] = [];
    for (let i = 0; i < overviewCards.length; i += 2) {
      chunks.push(overviewCards.slice(i, i + 2));
    }
    return chunks;
  }, [overviewCards]);
  const sectionMeta: Record<SectionKey, { gradient: string; Icon: typeof BookOpen; footer: string }> = {
    learn: {
      gradient: 'from-blue-500 to-indigo-600',
      Icon: BookOpen,
      footer: 'Browse Library →'
    },
    practice: {
      gradient: 'from-violet-500 to-purple-600',
      Icon: Brain,
      footer: 'Start Practice →'
    },
    field: {
      gradient: 'from-emerald-500 to-teal-600',
      Icon: Wrench,
      footer: 'Premium Features Available'
    }
  };

  // Flatten exercises for search
  const allExercises = useMemo(() => {
    return Object.entries(exercises).flatMap(([category, exs]) =>
      exs.map(ex => ({ ...ex, category }))
    );
  }, [exercises]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    const limit = 3; // Limit per category
    
    // Search patterns
    let count = 0;
    for (const pattern of patterns) {
      if (count >= limit) break;
      if (pattern.name.toLowerCase().includes(query) || 
          pattern.description?.toLowerCase().includes(query)) {
        results.push({
          id: pattern.id,
          name: pattern.name,
          type: 'pattern',
          category: pattern.category
        });
        count++;
      }
    }
    
    // Search assessments
    count = 0;
    for (const assessment of assessments) {
      if (count >= limit) break;
      if (assessment.name.toLowerCase().includes(query) ||
          assessment.description?.toLowerCase().includes(query)) {
        results.push({
          id: assessment.id,
          name: assessment.name,
          type: 'assessment',
          category: assessment.category
        });
        count++;
      }
    }
    
    // Search exercises
    count = 0;
    for (const exercise of allExercises) {
      if (count >= limit) break;
      if (exercise.name.toLowerCase().includes(query) ||
          exercise.description?.toLowerCase().includes(query)) {
        results.push({
          id: exercise.id,
          name: exercise.name,
          type: 'exercise',
          category: exercise.category
        });
        count++;
      }
    }
    
    // Search conditions
    count = 0;
    for (const condition of conditions) {
      if (count >= limit) break;
      if (condition.name.toLowerCase().includes(query) ||
          condition.overview?.toLowerCase().includes(query)) {
        results.push({
          id: condition.id,
          name: condition.name,
          type: 'condition',
          category: condition.category
        });
        count++;
      }
    }
    
    return results;
  }, [searchQuery, patterns, assessments, allExercises, conditions]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    // Navigate to the appropriate tab in Learn section, opening the selected item
    const tabMap: Record<SearchResult['type'], LearnTab> = {
      pattern: 'patterns',
      assessment: 'assessments',
      exercise: 'exercises',
      condition: 'conditions'
    };
    setSearchQuery('');
    setIsSearchFocused(false);
    onNavigate('learn', tabMap[result.type], result.id);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'pattern': return <Footprints className="w-4 h-4 text-blue-500" />;
      case 'assessment': return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'exercise': return <Dumbbell className="w-4 h-4 text-emerald-500" />;
      case 'condition': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    const labels: Record<SearchResult['type'], string> = {
      pattern: 'Pattern',
      assessment: 'Assessment',
      exercise: 'Exercise',
      condition: 'Condition'
    };
    return labels[type];
  };

  const handleSectionNavigate = (section: SectionKey) => {
    const navMap: Record<SectionKey, MainSection> = {
      learn: 'learn',
      practice: 'practice',
      field: 'field'
    };
    onNavigate(navMap[section]);
  };

  const clampIndex = (value: number, max: number) => Math.max(0, Math.min(value, max));

  const handleSwipe = (
    touchRef: React.RefObject<number | null>,
    deltaX: number,
    currentIndex: number,
    maxIndex: number,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const threshold = 40;
    if (Math.abs(deltaX) < threshold) return;
    if (deltaX > 0) {
      setter(clampIndex(currentIndex + 1, maxIndex));
    } else {
      setter(clampIndex(currentIndex - 1, maxIndex));
    }
    touchRef.current = null;
  };

  return (
    <div className="min-h-screen">
      {showInstallNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 py-2 text-sm text-emerald-900">
              <span>
                For a better experience, install the app.
                <span className="hidden sm:inline"> Quick access and offline use.</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={promptInstall}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                >
                  {installLabel}
                </button>
                <button
                  onClick={dismissInstallNotice}
                  className="p-1 text-emerald-700 hover:text-emerald-900"
                  aria-label="Close install notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPwaDebug && (
        <div className="bg-slate-900 text-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-4 py-2 text-xs">
              <span>secure: {debugInfo.isSecureContext ? 'yes' : 'no'}</span>
              <span>display: {debugInfo.displayMode}</span>
              <span>sw: {debugInfo.hasServiceWorker ? 'yes' : 'no'}</span>
              <span>controller: {debugInfo.hasController ? 'yes' : 'no'}</span>
              <span>prompt: {debugInfo.hasDeferredPrompt ? 'yes' : 'no'}</span>
              <span>scope: {debugInfo.registrationScope}</span>
              <span>active: {debugInfo.activeState}</span>
              <span>installing: {debugInfo.installingState}</span>
              <span>waiting: {debugInfo.waitingState}</span>
              <span>controller state: {debugInfo.controllerState}</span>
              <span>sw.js status: {debugInfo.swScriptStatus}</span>
              <span>sw.js ok: {debugInfo.swScriptOk ? 'yes' : 'no'}</span>
              <span>sw.js type: {debugInfo.swScriptContentType}</span>
              {debugInfo.swScriptError && <span>sw.js error: {debugInfo.swScriptError}</span>}
              <span>sw reg: {debugInfo.swRegisterStatus}</span>
              <span>sw reg scope: {debugInfo.swRegisterScope}</span>
              <span>sw reg script: {debugInfo.swRegisterScriptUrl}</span>
              {debugInfo.swRegisterError && <span>sw reg error: {debugInfo.swRegisterError}</span>}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshDebugInfo()}
                  className="px-2 py-1 bg-slate-700 text-slate-100 rounded hover:bg-slate-600"
                >
                  Refresh
                </button>
                <button
                  onClick={unregisterServiceWorkers}
                  className="px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-500"
                >
                  Unregister + Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/images/logo.svg" alt="Logo" className="w-8 h-8 rounded-lg" />
              <span className="text-lg font-medium text-slate-900">Corrective Exercise Toolkit</span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => onNavigate('about')}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                About
              </button>
              <button 
                onClick={() => onNavigate('contact')}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Contact
              </button>
              <button 
                onClick={() => onNavigate('legal')}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Legal
              </button>
            </nav>

            {/* Mobile Menu */}
            <div className="flex items-center gap-2 md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Menu className="w-5 h-5 text-slate-600" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <nav className="flex flex-col gap-6 mt-8 px-4">
                    <button 
                      onClick={() => {
                        onNavigate('about');
                        setMobileMenuOpen(false);
                    }}
                    className="text-left text-slate-900 hover:text-blue-600 transition-colors text-lg py-2 px-2 rounded-lg hover:bg-slate-50"
                  >
                    About
                  </button>
                  <button 
                    onClick={() => {
                      onNavigate('contact');
                      setMobileMenuOpen(false);
                    }}
                    className="text-left text-slate-900 hover:text-blue-600 transition-colors text-lg py-2 px-2 rounded-lg hover:bg-slate-50"
                  >
                    Contact
                  </button>
                  <button 
                    onClick={() => {
                      onNavigate('legal');
                      setMobileMenuOpen(false);
                    }}
                    className="text-left text-slate-900 hover:text-blue-600 transition-colors text-lg py-2 px-2 rounded-lg hover:bg-slate-50"
                  >
                    Legal & Privacy
                  </button>
                  {isInstallable && !isInstalled && (
                    <button
                      onClick={async () => {
                        await promptInstall();
                        setMobileMenuOpen(false);
                      }}
                      className="text-left text-emerald-700 hover:text-emerald-800 transition-colors text-lg py-2 px-2 rounded-lg hover:bg-emerald-50"
                    >
                      {installLabel}
                    </button>
                  )}
                  <div className="border-t border-slate-200 pt-6 mt-2">
                    <div className="text-sm text-slate-500 mb-3 px-2 font-medium">Quick Access</div>
                    <button 
                      onClick={() => {
                        onNavigate('learn');
                        setMobileMenuOpen(false);
                      }}
                      className="text-left text-slate-700 hover:text-blue-600 transition-colors mb-2 flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 w-full"
                    >
                      <BookOpen className="w-4 h-4" />
                      Learn
                    </button>
                    <button 
                      onClick={() => {
                        onNavigate('practice');
                        setMobileMenuOpen(false);
                      }}
                      className="text-left text-slate-700 hover:text-blue-600 transition-colors mb-2 flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 w-full"
                    >
                      <Brain className="w-4 h-4" />
                      Practice
                    </button>
                    <button 
                      onClick={() => {
                        onNavigate('field');
                        setMobileMenuOpen(false);
                      }}
                      className="text-left text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 w-full"
                    >
                      <Wrench className="w-4 h-4" />
                      Field Tools
                    </button>
                  </div>
                </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <img 
            src="/images/logo.svg" 
            alt="Corrective Exercise Toolkit" 
            className="w-24 h-24 mx-auto mb-6 rounded-2xl shadow-lg" 
          />
          <h1 className="text-slate-900 mb-4">
            Movement Literacy & Field-Ready Tools
          </h1>
          <p className="text-slate-600 text-lg">
            Professional toolkit for movement assessment, pattern recognition, and corrective exercise selection. Built for coaches, trainers, and movement enthusiasts.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-16" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patterns, assessments, exercises, conditions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            
            {/* Search Results Dropdown */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                {searchResults.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 text-left"
                      >
                        <div className="flex-shrink-0">
                          {getResultIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-900 font-medium truncate">
                            {result.name}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span className="capitalize">{getResultTypeLabel(result.type)}</span>
                            {result.category && (
                              <>
                                <span>·</span>
                                <span className="capitalize">{result.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchFocused(false);
                        onNavigate('learn');
                      }}
                      className="w-full px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                    >
                      Browse all in Library →
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <div className="text-slate-500 mb-2">No results found for &quot;{searchQuery}&quot;</div>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchFocused(false);
                        onNavigate('learn');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Browse the full library →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Overview & Access */}
        <div className="mb-12 md:mb-16">
          <div className="md:hidden -mx-4 px-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-medium text-slate-800">Overview & Access</span>
            </div>
            <div className="relative px-6">
              <div
                className="relative overflow-hidden"
                onTouchStart={(event) => {
                  statsTouchStart.current = event.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => {
                  if (statsTouchStart.current === null) return;
                  const deltaX = statsTouchStart.current - (event.changedTouches[0]?.clientX ?? statsTouchStart.current);
                  handleSwipe(statsTouchStart, deltaX, statsIndex, overviewCards.length - 1, setStatsIndex);
                }}
              >
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${statsIndex * 100}%)` }}
                >
                  {overviewCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => onNavigate('learn', card.id)}
                      className="w-full flex-shrink-0 px-2"
                    >
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-left hover:border-blue-300 hover:bg-blue-50 transition-colors h-full">
                        <div className={`text-2xl font-semibold mb-2 ${card.colorClass}`}>{card.value}</div>
                        <div className="text-slate-900 text-base mb-1">{card.label}</div>
                        <div className="text-slate-600 text-sm">{card.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {overviewCards.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setStatsIndex(clampIndex(statsIndex - 1, overviewCards.length - 1))}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-slate-600 hover:text-slate-900 transition-colors"
                    aria-label="Previous item"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsIndex(clampIndex(statsIndex + 1, overviewCards.length - 1))}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-slate-600 hover:text-slate-900 transition-colors"
                    aria-label="Next item"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-3">
              {overviewCards.map((_, idx) => (
                <button
                  key={`stat-dot-${idx}`}
                  type="button"
                  onClick={() => setStatsIndex(idx)}
                  className={`h-2.5 w-2.5 rounded-full transition ${statsIndex === idx ? 'bg-slate-800' : 'bg-slate-300'}`}
                  aria-label={`Go to stat ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-medium text-slate-800">Overview & Access</span>
            </div>
            <div className="relative px-8">
              <div className="relative overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${desktopOverviewIndex * 100}%)` }}
                >
                  {overviewDesktopSlides.map((slide, slideIdx) => (
                    <div key={`desktop-slide-${slideIdx}`} className="w-full flex-shrink-0 px-1">
                      <div className="grid grid-cols-2 gap-4">
                        {slide.map((card) => (
                          <button
                            key={`desktop-${card.id}`}
                            type="button"
                            onClick={() => onNavigate('learn', card.id)}
                            className="text-left bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer h-full"
                          >
                            <div className={`text-3xl font-semibold mb-2 ${card.colorClass}`}>{card.value}</div>
                            <div className="text-slate-900 text-base mb-1">{card.label}</div>
                            <div className="text-slate-600 text-sm">{card.description}</div>
                          </button>
                        ))}
                        {slide.length === 1 && <div className="h-full" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {overviewDesktopSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setDesktopOverviewIndex(clampIndex(desktopOverviewIndex - 1, overviewDesktopSlides.length - 1))}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-slate-600 hover:text-slate-900 transition-colors"
                    aria-label="Previous overview slide"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopOverviewIndex(clampIndex(desktopOverviewIndex + 1, overviewDesktopSlides.length - 1))}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-slate-600 hover:text-slate-900 transition-colors"
                    aria-label="Next overview slide"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {overviewDesktopSlides.map((_, idx) => (
                <button
                  key={`desktop-dot-${idx}`}
                  type="button"
                  onClick={() => setDesktopOverviewIndex(idx)}
                  className={`h-2.5 w-2.5 rounded-full transition ${desktopOverviewIndex === idx ? 'bg-slate-800' : 'bg-slate-300'}`}
                  aria-label={`Go to overview slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Sections - Mobile Carousel */}
        <div className="md:hidden -mx-4 px-4 mb-12">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-medium text-slate-800">Explore</span>
          </div>
          <div className="relative px-6">
            <div
              className="relative overflow-hidden"
              onTouchStart={(event) => {
                sectionsTouchStart.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                if (sectionsTouchStart.current === null) return;
                const deltaX = sectionsTouchStart.current - (event.changedTouches[0]?.clientX ?? sectionsTouchStart.current);
                handleSwipe(sectionsTouchStart, deltaX, sectionsIndex, 2, setSectionsIndex);
              }}
            >
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${sectionsIndex * 100}%)` }}
              >
                {(['learn', 'practice', 'field'] as SectionKey[]).map((section) => {
                  const { Icon, gradient, footer } = sectionMeta[section];
                  const isExpanded = mobileCardExpanded[section];
                  const title = section === 'learn' ? 'Learn' : section === 'practice' ? 'Practice' : 'Field Tools';
                  return (
                    <div
                      key={section}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSectionNavigate(section)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSectionNavigate(section);
                        }
                      }}
                      className={`w-full flex-shrink-0 px-3 bg-gradient-to-br ${gradient} rounded-2xl p-6 text-left text-white shadow-lg transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
                    >
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-white mb-2 text-lg font-semibold">{title}</h3>
                      <p className={`text-white/90 text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {CARD_DESCRIPTIONS[section]}
                      </p>
                      <button
                        type="button"
                        className="mt-2 text-white/90 text-xs underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMobileCardExpanded((prev) => ({
                            ...prev,
                            [section]: !isExpanded
                          }));
                        }}
                      >
                        {isExpanded ? 'See less' : 'See more'}
                      </button>
                      <div className="mt-5 text-white text-sm opacity-80">
                        {section === 'field' ? (
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-yellow-300" />
                            <span>{footer}</span>
                          </div>
                        ) : (
                          footer
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSectionsIndex(clampIndex(sectionsIndex - 1, 2))}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white transition-colors"
              aria-label="Previous section"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => setSectionsIndex(clampIndex(sectionsIndex + 1, 2))}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white transition-colors"
              aria-label="Next section"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          <div className="flex justify-center gap-2 mt-3">
            {[0, 1, 2].map((idx) => (
              <button
                key={`section-dot-${idx}`}
                type="button"
                onClick={() => setSectionsIndex(idx)}
                className={`h-2.5 w-2.5 rounded-full transition ${sectionsIndex === idx ? 'bg-slate-800' : 'bg-slate-300'}`}
                aria-label={`Go to section ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Main Sections */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-12">
          {/* Learn Section */}
          <button
            onClick={() => onNavigate('learn')}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 md:p-8 text-left hover:shadow-xl transition-all hover:scale-[1.02] group"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-white/30 transition-colors">
              <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h3 className="text-white mb-2 md:mb-3 text-lg md:text-xl">Learn</h3>
            <p className="text-blue-100 text-sm leading-relaxed md:leading-normal">
              {CARD_DESCRIPTIONS.learn}
            </p>
            <div className="mt-6 text-white text-sm opacity-80">
              Browse Library →
            </div>
          </button>

          {/* Practice Section */}
          <button
            onClick={() => onNavigate('practice')}
            className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 md:p-8 text-left hover:shadow-xl transition-all hover:scale-[1.02] group"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-white/30 transition-colors">
              <Brain className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h3 className="text-white mb-2 md:mb-3 text-lg md:text-xl">Practice</h3>
            <p className="text-violet-100 text-sm leading-relaxed md:leading-normal">
              {CARD_DESCRIPTIONS.practice}
            </p>
            <div className="mt-6 text-white text-sm opacity-80">
              Start Practice →
            </div>
          </button>

          {/* Field Tools Section */}
          <button
            onClick={() => onNavigate('field')}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 md:p-8 text-left hover:shadow-xl transition-all hover:scale-[1.02] group"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-white/30 transition-colors">
              <Wrench className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h3 className="text-white mb-2 md:mb-3 text-lg md:text-xl">Field Tools</h3>
            <p className="text-emerald-100 text-sm leading-relaxed md:leading-normal">
              {CARD_DESCRIPTIONS.field}
            </p>
            <div className="flex items-center gap-2 mt-6">
              <Crown className="w-4 h-4 text-yellow-300" />
              <div className="text-emerald-100 text-sm opacity-80">
                Premium Features Available
              </div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
