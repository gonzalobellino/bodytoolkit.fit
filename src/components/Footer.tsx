import React, { useState } from 'react';
import { Mail, Globe, AlertCircle } from 'lucide-react';
import { CONTACT_EMAIL } from '../config/env';
import type { MainSection, LearnTab } from '../App';

interface FooterProps {
  onNavigate: (section: MainSection, learnTab?: LearnTab, learnItemId?: string) => void;
}

export function Footer({ onNavigate }: FooterProps): React.JSX.Element {
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-4 md:mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2 md:mb-4">
              <img src="/images/logo.svg" alt="Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
              <span className="text-white font-medium">CET</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              <span className="md:hidden">
                Evidence-based movement education for professionals.
              </span>
              <span className="hidden md:inline">
                Evidence-based movement education and corrective exercise resources for professionals and enthusiasts.
              </span>
            </p>
          </div>

          {/* Quick Links */}
          <div className="hidden md:block">
            <h4 className="text-white mb-4">Learn</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('learn', 'patterns')} className="hover:text-white transition-colors">
                  Movement Patterns
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('learn', 'assessments')} className="hover:text-white transition-colors">
                  Assessments
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('learn', 'exercises')} className="hover:text-white transition-colors">
                  Exercise Library
                </button>
              </li>
            </ul>
          </div>

          {/* About */}
          <div className="hidden md:block">
            <h4 className="text-white mb-4">About</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition-colors">
                  About the Project
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors">
                  Contact
                </button>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Premium Features</a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="hidden md:block">
            <h4 className="text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('legal')} className="hover:text-white transition-colors">
                  Terms & Disclaimer
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    onNavigate('legal');
                    // Small delay to ensure page has rendered before scrolling
                    setTimeout(() => {
                      window.location.hash = '#privacy-policy';
                      const element = document.querySelector('#privacy-policy');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }} 
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 md:p-4 mb-4 md:mb-8">
          <div className="flex items-start gap-2 md:gap-3">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-amber-200 mb-1 text-sm md:text-base">Medical Disclaimer</div>
              <p className="text-xs md:text-sm text-amber-300/80 leading-relaxed">
                <span className="md:hidden">
                  {disclaimerExpanded ? (
                    <>
                      This platform provides educational content for movement professionals and enthusiasts. 
                      It is not a substitute for professional medical advice, diagnosis, or treatment. 
                      Always consult qualified healthcare providers for medical concerns.{' '}
                      <button
                        onClick={() => setDisclaimerExpanded(false)}
                        className="text-amber-200 underline hover:text-amber-100 transition-colors"
                      >
                        See less
                      </button>
                    </>
                  ) : (
                    <>
                      This platform provides educational content for movement professionals and enthusiasts.{' '}
                      <button
                        onClick={() => setDisclaimerExpanded(true)}
                        className="text-amber-200 underline hover:text-amber-100 transition-colors"
                      >
                        See more
                      </button>
                    </>
                  )}
                </span>
                <span className="hidden md:inline">
                  This platform provides educational content for movement professionals and enthusiasts. 
                  It is not a substitute for professional medical advice, diagnosis, or treatment. 
                  Always consult qualified healthcare providers for medical concerns.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 md:pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs md:text-sm text-slate-400 text-center md:text-left">
            <span className="md:hidden">
              © {new Date().getFullYear()} CET. Built with scientific rigor.
            </span>
            <span className="hidden md:inline">
              © {new Date().getFullYear()} Corrective Exercise Toolkit. Built with scientific rigor and accessibility in mind.
            </span>
          </p>
          <div className="flex items-center gap-4">
            <a href="https://golfstrength.coach" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" title="Website">
              <Globe className="w-4 h-4 md:w-5 md:h-5" />
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-slate-400 hover:text-white transition-colors" title="Email">
              <Mail className="w-4 h-4 md:w-5 md:h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
