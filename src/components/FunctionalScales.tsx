import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, FileSpreadsheet, Share2, Link2 } from 'lucide-react';
import type { FunctionalScale, Questionnaire } from '../types';
import { getText } from '../utils/formI18n';
import { Questionnaires } from './Questionnaires';
import { SendFormToClient } from './SendFormToClient';
import jsPDF from 'jspdf';

const COACH_LANG = 'en' as const;

interface FunctionalScalesProps {
  onBack: () => void;
  functionalScales: Record<string, FunctionalScale>;
  questionnaires?: Record<string, Questionnaire>;
}

export function FunctionalScales({ onBack, functionalScales, questionnaires = {} }: FunctionalScalesProps) {
  const [selectedScale, setSelectedScale] = useState<string | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string | null>(null);
  const [sendToClientData, setSendToClientData] = useState<{ id: string; name: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const scale = selectedScale ? functionalScales[selectedScale] : null;
  
  // Filter movement analysis questionnaires
  const movementAnalysisForms = Object.entries(questionnaires).filter(([id]) => 
    id === 'gsma' || id === 'lbmjma' || id === 'ubmjma' || id === 'oasma' || id === 'sjma'
  );

  const calculateScore = (): number => {
    if (!scale) return 0;
    return Object.values(answers).reduce((sum, val) => sum + (val ?? 0), 0);
  };

  const getFormValues = (): Record<string, number> => {
    return answers;
  };

  const buildSummary = (scaleData: FunctionalScale, data: Record<string, number>) => {
    const lines = [`${getText(scaleData.name, COACH_LANG)} (${scaleData.abbreviation})`, `Generated: ${new Date().toLocaleString()}`, ''];
    let score = 0;
    scaleData.questions.forEach((q, i) => {
      const val = data[`q${i}`];
      const opt = scaleData.options.find(o => o.value === val);
      if (val != null) score += val;
      lines.push(`${getText(q, COACH_LANG)}: ${opt ? getText(opt.label, COACH_LANG) : 'Not answered'}`);
    });
    lines.push('', `Score: ${score} / ${scaleData.maxScore}`);
    return {
      title: `${getText(scaleData.name, COACH_LANG)} (${scaleData.abbreviation})`,
      text: lines.join('\n')
    };
  };

  const ensurePageSpace = (doc: jsPDF, y: number, margin: number): number => {
    if (y > 740) {
      doc.addPage();
      return margin;
    }
    return y;
  };

  const buildPDFBlob = (scaleData: FunctionalScale): File | null => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const margin = 48;
      const maxWidth = 516;
      let cursorY = margin;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Corrective Exercise Toolkit', margin, cursorY);
      cursorY += 18;

      doc.setFontSize(16);
      doc.text(`${getText(scaleData.name, COACH_LANG)} (${scaleData.abbreviation})`, margin, cursorY);
      cursorY += 16;

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cursorY, margin + maxWidth, cursorY);
      cursorY += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const dateText = `Generated: ${new Date().toLocaleString()}`;
      const dateWrapped = doc.splitTextToSize(dateText, maxWidth);
      dateWrapped.forEach((line: string) => {
        cursorY = ensurePageSpace(doc, cursorY, margin);
        doc.text(line, margin, cursorY);
        cursorY += 14;
      });
      cursorY += 8;

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const data = getFormValues();
      scaleData.questions.forEach((q, i) => {
        cursorY = ensurePageSpace(doc, cursorY, margin);
        const questionId = `q${i}`;
        const val = data[questionId];
        const opt = scaleData.options.find(o => o.value === val);
        const answerText = opt ? getText(opt.label, COACH_LANG) : 'Not answered';
        const line = `${i + 1}. ${getText(q, COACH_LANG)}: ${answerText}`;
        const wrapped = doc.splitTextToSize(line, maxWidth);
        wrapped.forEach((w: string) => {
          cursorY = ensurePageSpace(doc, cursorY, margin);
          doc.text(w, margin, cursorY);
          cursorY += 14;
        });
      });

      cursorY = ensurePageSpace(doc, cursorY + 10, margin);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`Score: ${calculateScore()} / ${scaleData.maxScore}`, margin, cursorY);

      const blob = doc.output('blob');
      return new File([blob], `${scaleData.abbreviation}_result.pdf`, { type: 'application/pdf' });
    } catch (error) {
      console.error('Error building PDF:', error);
      return null;
    }
  };

  const autosaveScale = (abbr: string, answersToSave: Record<string, number>, isSubmitted: boolean) => {
    try {
      localStorage.setItem(`functional_scale_${abbr}`, JSON.stringify({ answers: answersToSave, submitted: isSubmitted }));
    } catch (error) {
      console.error('Error saving scale:', error);
    }
  };

  const loadSavedScale = (abbr: string): { answers: Record<string, number>; submitted: boolean } | null => {
    try {
      const saved = localStorage.getItem(`functional_scale_${abbr}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // Load saved progress
  useEffect(() => {
    if (selectedScale) {
      const saved = loadSavedScale(selectedScale);
      if (saved) {
        setAnswers(saved.answers ?? {});
        setSubmitted(saved.submitted ?? false);
      }
    }
  }, [selectedScale]);

  // Autosave on answer change
  useEffect(() => {
    if (selectedScale && Object.keys(answers).length > 0) {
      autosaveScale(selectedScale, answers, submitted);
    }
  }, [answers, submitted, selectedScale]);

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (selectedScale) {
      autosaveScale(selectedScale, answers, true);
    }
  };

  const handleReset = () => {
    if (selectedScale && confirm('Are you sure you want to reset this assessment?')) {
      localStorage.removeItem(`functional_scale_${selectedScale}`);
      setAnswers({});
      setSubmitted(false);
    }
  };

  const handleExportCSV = () => {
    if (!scale) return;
    const data = getFormValues();
    const rows = [
      ['Question', 'Answer', 'Value'],
      ...scale.questions.map((q, i) => {
        const questionId = `q${i}`;
        const val = data[questionId];
        const opt = scale.options.find(o => o.value === val);
        return [getText(q, COACH_LANG), opt ? getText(opt.label, COACH_LANG) : '', val ?? ''];
      }),
      ['', '', ''],
      ['Total Score', `${calculateScore()} / ${scale.maxScore}`, calculateScore()]
    ];

    const csv = rows.map(r => r.map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scale.abbreviation}_result.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!scale) return;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    const maxWidth = 516;
    let cursorY = margin;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Corrective Exercise Toolkit', margin, cursorY);
    cursorY += 18;

    doc.setFontSize(16);
    doc.text(`${getText(scale.name, COACH_LANG)} (${scale.abbreviation})`, margin, cursorY);
    cursorY += 16;

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, cursorY, margin + maxWidth, cursorY);
    cursorY += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const dateText = `Generated: ${new Date().toLocaleString()}`;
    const dateWrapped = doc.splitTextToSize(dateText, maxWidth);
    dateWrapped.forEach((line: string) => {
      cursorY = ensurePageSpace(doc, cursorY, margin);
      doc.text(line, margin, cursorY);
      cursorY += 14;
    });
    cursorY += 8;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const data = getFormValues();
    scale.questions.forEach((q, i) => {
      cursorY = ensurePageSpace(doc, cursorY, margin);
      const questionId = `q${i}`;
      const val = data[questionId];
      const opt = scale.options.find(o => o.value === val);
      const answerText = opt ? getText(opt.label, COACH_LANG) : 'Not answered';
      const line = `${i + 1}. ${getText(q, COACH_LANG)}: ${answerText}`;
      const wrapped = doc.splitTextToSize(line, maxWidth);
      wrapped.forEach((w: string) => {
        cursorY = ensurePageSpace(doc, cursorY, margin);
        doc.text(w, margin, cursorY);
        cursorY += 14;
      });
    });

    cursorY = ensurePageSpace(doc, cursorY + 10, margin);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Score: ${calculateScore()} / ${scale.maxScore}`, margin, cursorY);

    doc.save(`${scale.abbreviation}_result.pdf`);
  };

  const handleShare = async () => {
    if (!scale) return;
    const data = getFormValues();
    const summary = buildSummary(scale, data);

    if (navigator.share) {
      try {
        const pdf = buildPDFBlob(scale);
        if (pdf && navigator.canShare?.({ files: [pdf] })) {
          await navigator.share({
            title: summary.title,
            text: summary.text,
            files: [pdf]
          });
          return;
        }
        await navigator.share({
          title: summary.title,
          text: summary.text
        });
        return;
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary.text);
      alert('Share text copied to clipboard.');
      return;
    }

    alert('Sharing is not supported in this browser.');
  };

  // If a questionnaire is selected, render it using Questionnaires component
  if (selectedQuestionnaire && questionnaires[selectedQuestionnaire]) {
    const singleQuestionnaire: Record<string, Questionnaire> = {
      [selectedQuestionnaire]: questionnaires[selectedQuestionnaire]
    };
    return (
      <Questionnaires
        onBack={() => {
          setSelectedQuestionnaire(null);
        }}
        questionnaires={singleQuestionnaire}
        initialSelection={selectedQuestionnaire}
      />
    );
  }

  if (scale) {
    const score = calculateScore();
    const percentage = scale.maxScore > 0 ? ((score / scale.maxScore) * 100).toFixed(1) : '0';

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedScale(null);
                    setAnswers({});
                    setSubmitted(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <div className="text-slate-900">{getText(scale.name, COACH_LANG)}</div>
                  <div className="text-xs text-slate-500">({scale.abbreviation})</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Export CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Export PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Reset"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Score Display */}
          {submitted && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-900 font-medium">Total Score</span>
                <span className="text-2xl font-bold text-blue-600">
                  {score} / {scale.maxScore}
                </span>
              </div>
              <div className="text-sm text-blue-700 mt-2">
                Percentage: {percentage}%
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="space-y-6">
              {scale.questions.map((question, idx) => {
                const questionId = `q${idx}`;
                return (
                  <div key={idx} className="pb-6 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="text-sm text-slate-700 mb-3">
                      {idx + 1}. {getText(question, COACH_LANG)}
                    </div>
                    <div className="space-y-2">
                      {scale.options.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={questionId}
                            value={option.value}
                            checked={answers[questionId] === option.value}
                            onChange={() => handleAnswer(questionId, option.value)}
                            disabled={submitted}
                            className="mt-1 w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-slate-700">{getText(option.label, COACH_LANG)}</div>
                            <div className="text-xs text-slate-500 mt-1">Score: {option.value}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          {!submitted && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Progress saved automatically
              </div>
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < scale.questions.length}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Calculate Score
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
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
                <div className="text-slate-900">Functional Evaluations</div>
                <div className="text-xs text-slate-500">Movement Analysis Forms</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-slate-900 mb-2">Available Functional Evaluations</h2>
          <p className="text-slate-600">
            Select a functional evaluation to begin assessment
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Functional Scales (LEFS, UEFI) — client-sendable */}
          {Object.entries(functionalScales).map(([id, s]) => (
            <div
              key={id}
              className="bg-white rounded-xl border border-slate-200 p-6 text-left"
            >
              <div className="mb-4">
                <h3 className="text-slate-900 mb-1 font-normal">{getText(s.name, COACH_LANG)}</h3>
                <span className="text-xs text-slate-500">({s.abbreviation})</span>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Score range: {s.minScore} - {s.maxScore}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedScale(id)}
                  className="flex items-center gap-2 text-blue-600 text-sm hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors -ml-1"
                >
                  Start Assessment →
                </button>
                <button
                  type="button"
                  onClick={() => setSendToClientData({ id, name: getText(s.name, COACH_LANG) })}
                  className="flex items-center gap-1.5 text-sm text-orange-600 hover:bg-orange-50 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Send to Client
                </button>
              </div>
            </div>
          ))}

          {/* Movement Analysis Forms — coach only, no send button */}
          {movementAnalysisForms.map(([id, q]) => (
            <div
              key={id}
              className="bg-white rounded-xl border border-slate-200 p-6 text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-slate-900 mb-1 font-normal">{getText(q.name, COACH_LANG)}</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {q.description ? getText(q.description, COACH_LANG) : 'Movement pattern assessment form'}
              </p>
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedQuestionnaire(id)}
                  className="flex items-center gap-2 text-blue-600 text-sm hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors -ml-1"
                >
                  Start Assessment →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {sendToClientData && (
        <SendFormToClient
          open={!!sendToClientData}
          onOpenChange={open => { if (!open) setSendToClientData(null); }}
          formId={sendToClientData.id}
          formType="scale"
          formName={sendToClientData.name}
        />
      )}
    </div>
  );
}
