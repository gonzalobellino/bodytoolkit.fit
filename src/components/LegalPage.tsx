import React, { useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Shield, FileText } from 'lucide-react';

interface LegalPageProps {
  onBack: () => void;
}

export function LegalPage({ onBack }: LegalPageProps): React.JSX.Element {
  // Scroll to section if hash is present
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

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
        <h1 className="text-slate-900 mb-8">Terms of Use & Legal Disclaimer</h1>

        {/* Warning Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8 rounded-r-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-amber-900 mb-2">Important Notice</h3>
              <p className="text-amber-800 leading-relaxed">
                This platform is for educational purposes only. Always consult qualified healthcare professionals 
                before beginning any exercise program or if you have any medical concerns.
              </p>
            </div>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <section className="bg-white rounded-xl p-8 border border-slate-200 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-slate-900">Medical Disclaimer</h2>
          </div>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              <strong>This platform does NOT provide medical advice.</strong> The information contained on this website, 
              including text, graphics, images, and other material, is for educational and informational purposes only.
            </p>
            <p>
              The content is not intended to be a substitute for professional medical advice, diagnosis, or treatment. 
              Always seek the advice of your physician or other qualified health provider with any questions you may have 
              regarding a medical condition.
            </p>
            <p>
              <strong>Never disregard professional medical advice or delay in seeking it because of something you have read on this platform.</strong>
            </p>
            <p>
              If you think you may have a medical emergency, call your doctor or emergency services immediately.
            </p>
          </div>
        </section>

        {/* Exercise Safety Disclaimer */}
        <section className="bg-white rounded-xl p-8 border border-slate-200 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-slate-900">Exercise & Activity Disclaimer</h2>
          </div>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              Before beginning any exercise program, you should consult with your healthcare provider, especially if you:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Have any pre-existing medical conditions</li>
              <li>Are currently experiencing pain or discomfort</li>
              <li>Have a history of injury</li>
              <li>Are pregnant or postpartum</li>
              <li>Are over 40 years old and have not been physically active</li>
              <li>Take any medications that may affect your exercise capacity</li>
            </ul>
            <p>
              <strong>By using this platform, you acknowledge that:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You participate in any exercises or activities at your own risk</li>
              <li>You will discontinue any activity that causes pain or discomfort</li>
              <li>You understand the inherent risks associated with physical activity</li>
              <li>You have consulted with appropriate healthcare professionals before beginning</li>
            </ul>
          </div>
        </section>

        {/* Scope of Practice */}
        <section className="bg-white rounded-xl p-8 border border-slate-200 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-slate-900">Scope of Practice</h2>
          </div>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              This platform is designed for educational purposes for movement professionals, coaches, trainers, 
              and informed exercise enthusiasts. The information provided is not intended to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Diagnose any medical condition or pathology</li>
              <li>Prescribe treatment for any medical condition</li>
              <li>Replace the expertise of licensed healthcare providers</li>
              <li>Provide individualized medical or therapeutic advice</li>
            </ul>
            <p>
              <strong>Red Flags and Medical Referral:</strong> This platform includes information about &quot;red flags&quot; 
              that indicate the need for medical referral. If you or your clients experience any red flag symptoms, 
              immediately seek evaluation from an appropriate healthcare provider.
            </p>
          </div>
        </section>

        {/* Liability Limitation */}
        <section className="bg-white rounded-xl p-8 border border-slate-200 mb-8">
          <h2 className="text-slate-900 mb-4">Limitation of Liability</h2>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              The creator and operators of this platform shall not be liable for any direct, indirect, incidental, 
              consequential, or punitive damages arising from your access to or use of this platform.
            </p>
            <p>
              This includes, but is not limited to, injuries, disabilities, or any other physical or mental harm 
              resulting from the use or misuse of information provided on this platform.
            </p>
          </div>
        </section>

        {/* Professional Use */}
        <section className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-8">
          <h3 className="text-slate-900 mb-3">For Movement Professionals</h3>
          <p className="text-slate-700 leading-relaxed">
            If you are a fitness professional, coach, or trainer using this platform as a reference:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 mt-3 text-slate-700">
            <li>Always work within your scope of practice and professional credentials</li>
            <li>Maintain appropriate liability insurance</li>
            <li>Obtain proper informed consent from clients</li>
            <li>Screen clients appropriately and refer to healthcare providers when indicated</li>
            <li>Stay current with your certifications and continuing education</li>
          </ul>
        </section>

        {/* Data & Privacy */}
        <section id="privacy-policy" className="bg-white rounded-xl p-8 border border-slate-200 mb-8">
          <h2 className="text-slate-900 mb-4">Data & Privacy</h2>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              <strong>All data stays on your device.</strong> This is a fully client-side application. 
              Photos, videos, and assessments are stored locally in your browser and never uploaded to any server.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Media capture and AI analysis run entirely in your browser</li>
              <li>No data is transmitted to external servers</li>
              <li>Export destinations are chosen by you</li>
              <li>Clearing browser data removes all stored assessments</li>
            </ul>
            <p className="text-sm text-slate-500 mt-4">
              When capturing client data, you remain responsible for obtaining informed consent 
              and handling that data in compliance with applicable regulations (HIPAA, GDPR, etc.).
            </p>
          </div>
        </section>

        {/* Acceptance */}
        <section className="bg-slate-100 rounded-xl p-6 border border-slate-300">
          <h3 className="text-slate-900 mb-3">Acceptance of Terms</h3>
          <p className="text-slate-700 leading-relaxed">
            By using this platform, you acknowledge that you have read, understood, and agree to be bound by 
            these terms and disclaimers. If you do not agree with any part of these terms, you should not use this platform.
          </p>
          <p className="text-slate-700 leading-relaxed mt-4">
            Last updated: January 2026
          </p>
        </section>
      </div>
    </div>
  );
}
