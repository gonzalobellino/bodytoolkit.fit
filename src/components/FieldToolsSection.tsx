import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Video, ClipboardList, User, Ruler, TrendingUp, Activity, Scale } from 'lucide-react';
import { VisualAssessment } from './VisualAssessment';
import { Questionnaires } from './Questionnaires';
import { FunctionalScales } from './FunctionalScales';
import { PhotoAnalysis } from './PhotoAnalysis';
import { VideoAnalysis } from './VideoAnalysis';
import { DualVideoAnalysis } from './DualVideoAnalysis';
import { GaitAnalysis } from './GaitAnalysis';
import { MovementAnalysis } from './MovementAnalysis';
import { CalibrationPage } from './CalibrationPage';
import { FeatureGate } from './ui/FeatureGate';
import { PremiumBadge } from './ui/PremiumBadge';
import { usePremium } from '../contexts/PremiumContext';

import type { Questionnaire, FunctionalScale } from '../types';

interface FieldToolsSectionProps {
  onBack: () => void;
  questionnaires?: Record<string, Questionnaire>;
  functionalScales?: Record<string, FunctionalScale>;
}

type ToolView = 'list' | 'visual' | 'photo' | 'video' | 'dual-video' | 'questionnaires' | 'functional-scales' | 'gait' | 'movement-analysis' | 'calibration';

interface Tool {
  id: number;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: string[];
  premiumFeatures?: string[];
  premium: boolean;
  comingSoon: boolean;
}

const tools: Tool[] = [
  {
    id: 1,
    name: 'Video Analysis',
    description: 'Record and analyze movement patterns with frame-by-frame playback, drawing tools, and angle measurements.',
    icon: Video,
    color: 'from-blue-500 to-cyan-500',
    features: ['Slow Motion', 'Goniometer', 'Drawing Tools', 'Side-by-Side Compare'],
    premiumFeatures: ['AI Analysis', 'Dual Video'], // Features that require premium (gated inside)
    premium: false, // Base Video Analysis is free
    comingSoon: false,
  },
  {
    id: 2,
    name: 'Photo Analysis',
    description: 'Capture still images, mark anatomical landmarks, and measure postural alignment.',
    icon: Camera,
    color: 'from-violet-500 to-purple-500',
    features: ['Grid Overlay', 'Plumb Line', 'Drawing Tools', 'Goniometer', 'Export & Share'],
    premium: false,
    comingSoon: false,
  },
  {
    id: 3,
    name: 'Visual Assessment',
    description: 'Mark dysfunction points on anatomical silhouettes to document and track client issues.',
    icon: User,
    color: 'from-emerald-500 to-teal-500',
    features: ['Body Map', 'Pain Scale', 'Dysfunction Patterns', 'Export CSV'],
    premium: false,
    comingSoon: false,
  },
  {
    id: 4,
    name: 'Client Questionnaires',
    description: 'Pre-session intake forms and physical activity readiness assessment.',
    icon: ClipboardList,
    color: 'from-orange-500 to-red-500',
    features: ['Physical Activity Readiness', 'Client Questionnaire', 'Send to Client via Link / QR'],
    premium: false,
    comingSoon: false,
  },
  {
    id: 5,
    name: 'Functional Evaluations',
    description: 'Functional movement assessments including scales and movement analysis forms.',
    icon: Ruler,
    color: 'from-pink-500 to-rose-500',
    features: ['LEFS', 'UEFI', 'Movement Patterns Forms', 'Send to Client via Link / QR'],
    premium: false,
    comingSoon: false,
  },
  {
    id: 6,
    name: 'Gait Analysis',
    description: 'AI-powered gait analysis with automatic phase detection and compensation identification.',
    icon: Activity,
    color: 'from-teal-500 to-emerald-500',
    features: ['Phase Detection', 'Cadence Metrics', 'Symmetry Score', 'AI Compensation Detection', 'ArUco Markers Auto-detection'],
    premium: true,
    comingSoon: true,
  },
  {
    id: 7,
    name: 'Movement Analysis',
    description: 'Analyze symmetry, compare to normative data, and detect movement compensations in real-time.',
    icon: Scale,
    color: 'from-purple-500 to-pink-500',
    features: ['Bilateral Symmetry', 'Normative Comparison', 'Compensation Detection', 'ArUco Markers Auto-detection'],
    premium: true,
    comingSoon: true,
  },
  {
    id: 8,
    name: 'Progress Tracking',
    description: 'Monitor client progress over time with charts, graphs, and comparative analysis.',
    icon: TrendingUp,
    color: 'from-indigo-500 to-blue-500',
    features: ['Timeline View', 'Before/After', 'Metrics Dashboard', 'Client Notes'],
    premium: false,
    comingSoon: true,
  },
];

export function FieldToolsSection({ onBack, questionnaires, functionalScales }: FieldToolsSectionProps): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ToolView>('list');
  const { hasFeature } = usePremium();

  if (currentView === 'visual') {
    return <VisualAssessment onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'questionnaires' && questionnaires) {
    return <Questionnaires onBack={() => setCurrentView('list')} questionnaires={questionnaires} />;
  }

  if (currentView === 'functional-scales' && functionalScales) {
    return <FunctionalScales onBack={() => setCurrentView('list')} functionalScales={functionalScales} questionnaires={questionnaires} />;
  }

  if (currentView === 'photo') {
    return <PhotoAnalysis onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'video') {
    return (
      <VideoAnalysis 
        onBack={() => setCurrentView('list')}
        onSwitchToDual={() => setCurrentView('dual-video')}
      />
    );
  }

  if (currentView === 'dual-video') {
    return (
      <FeatureGate feature="dualVideoSync" featureName="Dual Video Analysis">
        <DualVideoAnalysis onBack={() => setCurrentView('video')} />
      </FeatureGate>
    );
  }

  if (currentView === 'gait') {
    return <GaitAnalysis onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'movement-analysis') {
    return <MovementAnalysis onBack={() => setCurrentView('list')} />;
  }

  if (currentView === 'calibration') {
    return <CalibrationPage onBack={() => setCurrentView('list')} />;
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
                <div className="text-slate-900">Field Tools</div>
                <div className="text-xs text-slate-500">Assessment & Documentation</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-slate-900 mb-2">Your Toolbox</h2>
          <p className="text-slate-600">
            Professional tools for real-time assessment, analysis, and client documentation.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isPremiumFeature = tool.premium && !tool.comingSoon;
            const hasAccess = isPremiumFeature ? hasFeature('dualVideoSync') : true;
            
            const handleClick = (): void => {
              if (tool.comingSoon) return;
              
              if (isPremiumFeature && !hasAccess) {
                // Will be handled by FeatureGate
                return;
              }
              
              if (tool.id === 1) setCurrentView('video');
              if (tool.id === 2) setCurrentView('photo');
              if (tool.id === 3) setCurrentView('visual');
              if (tool.id === 4) setCurrentView('questionnaires');
              if (tool.id === 5) setCurrentView('functional-scales');
              if (tool.id === 6) setCurrentView('gait');
              if (tool.id === 7) setCurrentView('movement-analysis');
            };
            
            const toolCard = (
              <div
                onClick={handleClick}
                className={`bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all group ${
                  tool.comingSoon ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                }`}
              >
                {/* Tool Header */}
                <div className={`bg-gradient-to-br ${tool.color} p-6 relative`}>
                  {tool.comingSoon && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs text-slate-700">
                      Coming Soon
                    </div>
                  )}
                  {tool.premium && !tool.comingSoon && (
                    <div className="absolute top-4 right-4">
                      <PremiumBadge variant="small" />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {!tool.comingSoon && !tool.premium && (
                        <div className="text-white text-sm">
                          Launch →
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-white mb-2">{tool.name}</h3>
                  <p className="text-white/90 text-sm leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Tool Features */}
                <div className="p-6">
                  <div className="text-xs text-slate-500 mb-3">Key Features</div>
                  <div className="grid grid-cols-2 gap-2">
                    {tool.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-slate-700 flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        {feature}
                      </div>
                    ))}
                    {/* Premium Features */}
                    {tool.premiumFeatures?.map((feature, idx) => (
                      <div
                        key={`premium-${idx}`}
                        className="text-sm text-slate-700 flex items-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        {feature}
                        <PremiumBadge variant="small" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
            
            if (isPremiumFeature) {
              const premiumFeatureMap: Record<number, 'gaitAnalysis' | 'symmetryAnalysis' | 'movementComparison'> = {
                6: 'gaitAnalysis',
                7: 'movementComparison',
                8: 'movementComparison',
              };
              const featureKey = premiumFeatureMap[tool.id] || 'gaitAnalysis';
              
              return (
                <FeatureGate
                  key={tool.id}
                  feature={featureKey}
                  featureName={tool.name}
                >
                  {toolCard}
                </FeatureGate>
              );
            }
            
            return <React.Fragment key={tool.id}>{toolCard}</React.Fragment>;
          })}
        </div>

        {/* Quick Tips */}
        <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
          <h3 className="text-slate-900 mb-4">Field Work Best Practices</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-900 mb-2">📹 Video Analysis Tips</div>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Use well-lit environments</li>
                <li>• Position camera perpendicular to movement plane</li>
                <li>• Record from multiple angles</li>
                <li>• Use landmarks for reference points</li>
              </ul>
            </div>
            <div>
              <div className="text-sm text-slate-900 mb-2">📋 Assessment Guidelines</div>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Always screen for red flags first</li>
                <li>• Document baseline measurements</li>
                <li>• Use standardized protocols when possible</li>
                <li>• Track progress consistently</li>
              </ul>
            </div>
            <div>
              <div className="text-sm text-slate-900 mb-2">📐 Spatial Calibration</div>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Use ArUco markers for real measurements</li>
                <li>• Convert pixels to centimeters</li>
                <li>• Improve step length accuracy</li>
              </ul>
              <button
                onClick={() => setCurrentView('calibration')}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                View tutorial
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
