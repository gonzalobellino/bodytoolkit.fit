import React from 'react';
import { ArrowLeft, Heart, Target, Users, GraduationCap, Globe } from 'lucide-react';
import { SHOW_TPI_LEVEL1_BADGE, SHOW_TPI_LEVEL2_BADGE } from '@/config/env';

interface AboutPageProps {
  onBack: () => void;
}

function getCertifications(): string[] {
  const list: string[] = [
    'ISSA CPT',
    'ISSA Corrective Exercise Specialist',
  ];
  if (SHOW_TPI_LEVEL1_BADGE) list.push('TPI Level 1');
  if (SHOW_TPI_LEVEL2_BADGE) list.push('TPI Fitness Level 2');
  return list;
}

export function AboutPage({ onBack }: AboutPageProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <img 
            src="/images/logo.svg" 
            alt="Corrective Exercise Toolkit" 
            className="w-20 h-20 mx-auto mb-6 rounded-xl shadow-md" 
          />
          <h1 className="text-slate-900 mb-4">About This Project</h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Making evidence-based movement education accessible to everyone.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-12 border border-blue-100">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900 mb-3">Mission</h2>
              <p className="text-slate-700 leading-relaxed">
                I created this platform to share knowledge and make the study of human movement accessible to everyone. 
                During my own training as a movement professional, I found that valuable information existed across the internet, 
                but it was fragmented, dispersed, and difficult to navigate efficiently.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                My goal is to compile this scattered knowledge into a cohesive, easy-to-access compendium. 
                Whether you&apos;re a coach looking to improve your expertise, an exercise enthusiast wanting to understand your body better, 
                or a movement professional seeking to review concepts and train more effectively—this platform is for you.
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-slate-900 mb-2">Evidence-Based</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Most patterns include links to peer-reviewed research, ensuring recommendations are grounded in science.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-slate-900 mb-2">Accessible</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Complex concepts presented clearly. Knowledge shouldn&apos;t be locked behind paywalls or scattered across dozens of sources.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-slate-900 mb-2">Practical</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Designed for real-world application. From assessment to intervention, with clear progressions and regressions.
            </p>
          </div>
        </div>

        {/* About the Creator */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 mb-12">
          <h2 className="text-slate-900 mb-2">About the Creator</h2>
          <p className="text-2xl font-bold text-slate-900 mb-4">Gonzalo Bellino</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {getCertifications().map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="text-slate-600 leading-relaxed mb-4">
            I&apos;m 52 years old and I&apos;ve spent my whole life doing sports. Golf came later and hooked me for the same reason it&apos;s hard: it demands precision, mobility, power, and a mindset that doesn&apos;t quit. I became a coach for people who feel the same — who want to keep improving regardless of age, and who need someone who genuinely understands how their body moves.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            This toolkit is a direct extension of my coaching practice. Everything in it — the patterns, the assessments, the corrective progressions — reflects the methodology I apply daily with my clients.
          </p>
          <a
            href="https://golfstrength.coach?utm_source=corrective-toolkit&utm_medium=app&utm_campaign=referral&utm_content=about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Globe className="w-4 h-4" />
            Visit golfstrength.coach
          </a>
        </div>

        {/* Future Vision */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-slate-900 mb-3">Continuous Evolution</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                This platform is constantly evolving. I&apos;m committed to:
              </p>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600">•</span>
                  <span>Adding new patterns, exercises, and assessments based on latest research</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600">•</span>
                  <span>Developing advanced features like AI-powered video analysis (premium)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600">•</span>
                  <span>Enhancing quiz generation and evaluation features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600">•</span>
                  <span>Building community features to facilitate knowledge sharing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
