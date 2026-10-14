import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, FileText, FileSpreadsheet, RotateCcw, Save, Link2 } from 'lucide-react';
import type { FormLang, Questionnaire } from '../types';
import { getText } from '../utils/formI18n';
import jsPDF from 'jspdf';
import { SendFormToClient } from './SendFormToClient';

interface QuestionnairesProps {
  onBack: () => void;
  questionnaires: Record<string, Questionnaire>;
  initialSelection?: string | null;
}

interface BodymapRegion {
  id: string;
  label: string;
  views: ('front' | 'back')[];
  front?: { top: string; left: string };
  back?: { top: string; left: string };
}

const bodymapRegions: BodymapRegion[] = [
  { id: 'head',               label: 'Head',                 views: ['front', 'back'], front: { top: '8%',  left: '50%' }, back: { top: '8%',  left: '50%' } },
  { id: 'neck',               label: 'Neck',                 views: ['front', 'back'], front: { top: '17%', left: '50%' }, back: { top: '17%', left: '50%' } },
  { id: 'shoulder-left',      label: 'Left shoulder',        views: ['front'],         front: { top: '24%', left: '28%' } },
  { id: 'shoulder-right',     label: 'Right shoulder',       views: ['front'],         front: { top: '24%', left: '72%' } },
  { id: 'elbow-left',         label: 'Left elbow',           views: ['front'],         front: { top: '38%', left: '18%' } },
  { id: 'elbow-right',        label: 'Right elbow',          views: ['front'],         front: { top: '38%', left: '82%' } },
  { id: 'wrist-left',         label: 'Left wrist',           views: ['front'],         front: { top: '51%', left: '12%' } },
  { id: 'wrist-right',        label: 'Right wrist',          views: ['front'],         front: { top: '51%', left: '88%' } },
  { id: 'shoulder-blade-left', label: 'Left shoulder blade', views: ['back'],          back:  { top: '27%', left: '33%' } },
  { id: 'shoulder-blade-right', label: 'Right shoulder blade', views: ['back'],        back:  { top: '27%', left: '67%' } },
  { id: 'thoracic',           label: 'Thoracic spine',       views: ['back'],          back:  { top: '34%', left: '50%' } },
  { id: 'lumbar',             label: 'Lumbar spine',         views: ['back'],          back:  { top: '47%', left: '50%' } },
  { id: 'hip-left',           label: 'Left hip',             views: ['front', 'back'], front: { top: '57%', left: '38%' }, back: { top: '57%', left: '38%' } },
  { id: 'hip-right',          label: 'Right hip',            views: ['front', 'back'], front: { top: '57%', left: '62%' }, back: { top: '57%', left: '62%' } },
  { id: 'knee-left',          label: 'Left knee',            views: ['front', 'back'], front: { top: '73%', left: '37%' }, back: { top: '73%', left: '37%' } },
  { id: 'knee-right',         label: 'Right knee',           views: ['front', 'back'], front: { top: '73%', left: '63%' }, back: { top: '73%', left: '63%' } },
  { id: 'ankle-left',         label: 'Left ankle',           views: ['front', 'back'], front: { top: '88%', left: '38%' }, back: { top: '88%', left: '38%' } },
  { id: 'ankle-right',        label: 'Right ankle',          views: ['front', 'back'], front: { top: '88%', left: '62%' }, back: { top: '88%', left: '62%' } },
];

const bodymapLabelById = bodymapRegions.reduce((acc, region) => {
  acc[region.id] = region.label;
  return acc;
}, {} as Record<string, string>);

type AnswersMap = Record<string, unknown>;
type QuestionnaireQuestion = Questionnaire['sections'][number]['questions'][number];
type SavedQuestionnaire = { answers: AnswersMap; submitted: boolean };

function isQuestionVisible(q: QuestionnaireQuestion, answers: AnswersMap): boolean {
  if (!q.showWhen) return true;
  const raw = answers[q.showWhen.questionId];
  const str = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!str) return false;
  return q.showWhen.values.some(v => v.toLowerCase() === str);
}

export function formatFormAnswer(question: QuestionnaireQuestion, value: unknown, lang: FormLang = 'en'): string {
  if (question.type === 'bodymap') {
    const ids = String(value ?? '').split(',').filter(Boolean);
    if (ids.length === 0) return '';
    return ids.map(id => bodymapLabelById[id] ?? id).join('; ');
  }
  if (question.type === 'checkbox') {
    return value === 'Yes' || value === true ? 'Yes' : 'No';
  }
  if (question.type === 'yes_no') {
    return value === 'Yes' || value === true ? 'Yes' : value === 'No' || value === false ? 'No' : '';
  }
  if (question.type === 'multi_select') {
    if (Array.isArray(value) && value.length > 0) {
      return value.map(v => {
        if (typeof v === 'object' && v !== null && 'other' in v) {
          return `Other: ${(v as { other: string }).other}`;
        }
        const option = question.options?.find(opt => opt.value === v);
        return option ? getText(option.label, lang) : String(v);
      }).join(', ');
    }
    return '';
  }
  if (question.type === 'select') {
    if (value === undefined || value === null || value === '') return '';
    const option = question.options?.find(opt => opt.value === value);
    return option ? getText(option.label, lang) : String(value);
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

export function buildQuestionnaireSummary(scaleData: Questionnaire, data: AnswersMap, lang: FormLang = 'en'): { title: string; text: string; } {
  const lines = [`${getText(scaleData.name, lang)} (${scaleData.abbreviation ?? ''})`, `Generated: ${new Date().toLocaleString()}`, ''];
  scaleData.sections.forEach(section => {
    lines.push('');
    lines.push(getText(section.title, lang));
    section.questions.forEach(question => {
      const answer = formatFormAnswer(question, data[question.id], lang);
      lines.push(`${getText(question.label, lang)}: ${answer ?? '-'}`);
    });
  });
  return {
    title: `${getText(scaleData.name, lang)} (${scaleData.abbreviation ?? ''})`,
    text: lines.join('\n')
  };
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  return y + 16;
}

function ensurePageSpace(doc: jsPDF, y: number, margin: number): number {
  if (y > 740) {
    doc.addPage();
    return margin;
  }
  return y;
}

function drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number): number {
  const labelText = `${label}:`;
  const labelWrapped = doc.splitTextToSize(labelText, maxWidth);
  const valueText = String(value ?? '-');
  const valueWrapped = doc.splitTextToSize(valueText, maxWidth - 16);

  y = ensurePageSpace(doc, y, x);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  labelWrapped.forEach((line: string) => {
    y = ensurePageSpace(doc, y, x);
    doc.text(line, x, y);
    y += 14;
  });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  valueWrapped.forEach((line: string) => {
    y = ensurePageSpace(doc, y, x);
    doc.text(line, x + 16, y);
    y += 14;
  });
  doc.setTextColor(15, 23, 42);
  return y;
}

function drawQuestionList(doc: jsPDF, questions: QuestionnaireQuestion[], data: AnswersMap, x: number, y: number, maxWidth: number, lang: FormLang): number {
  questions.forEach(question => {
    const answer = formatFormAnswer(question, data[question.id], lang) ?? '-';
    y = drawLabelValue(doc, getText(question.label, lang), answer, x, y, maxWidth);
  });
  return y + 6;
}

function buildQuestionnairePDF(scaleData: Questionnaire, data: AnswersMap, selectedId: string | null, lang: FormLang = 'en'): { doc: jsPDF; filename: string; } | null {
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
    doc.text(`${getText(scaleData.name, lang)} (${scaleData.abbreviation ?? ''})`, margin, cursorY);
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

    const sections = scaleData.sections ?? [];
    if (sections.length > 0) {
      cursorY = drawSectionHeader(doc, getText(sections[0].title, lang), margin, cursorY);
      cursorY = drawQuestionList(doc, sections[0].questions, data, margin, cursorY, maxWidth, lang);
    }
    for (let i = 1; i < sections.length; i += 1) {
      cursorY = ensurePageSpace(doc, cursorY, margin);
      cursorY = drawSectionHeader(doc, getText(sections[i].title, lang), margin, cursorY);
      cursorY = drawQuestionList(doc, sections[i].questions, data, margin, cursorY, maxWidth, lang);
    }

    return {
      doc,
      filename: `${scaleData.abbreviation ?? selectedId ?? 'questionnaire'}_result.pdf`
    };
  } catch (error) {
    console.error('Error building PDF:', error);
    alert('PDF export is unavailable.');
    return null;
  }
}

function buildPDFBlob(scaleData: Questionnaire, data: AnswersMap, selectedId: string | null): File | null {
  const pdf = buildQuestionnairePDF(scaleData, data, selectedId);
  if (!pdf) return null;
  try {
    const blob = pdf.doc.output('blob');
    return new File([blob], pdf.filename, { type: 'application/pdf' });
  } catch (error) {
    console.error('Error creating PDF blob:', error);
    return null;
  }
}

function autosaveQuestionnaire(abbr: string, currentAnswers: AnswersMap, wasSubmitted: boolean): void {
  try {
    localStorage.setItem(`questionnaire_${abbr}`, JSON.stringify({ answers: currentAnswers, submitted: wasSubmitted }));
  } catch (error) {
    console.error('Error saving questionnaire:', error);
  }
}

function loadSavedQuestionnaire(abbr: string): SavedQuestionnaire | null {
  try {
    const saved = localStorage.getItem(`questionnaire_${abbr}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

interface BodyMapQuestionProps {
  question: QuestionnaireQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
  lang: FormLang;
}

function BodyMapQuestion({ question, value, onChange, disabled, lang }: BodyMapQuestionProps): React.JSX.Element {
  const selectedValues = Array.isArray(value)
    ? value.map(String)
    : String(value ?? '').split(',').filter(Boolean);
  const selected = new Set(selectedValues);

  const handleRegionClick = (regionId: string): void => {
    if (disabled) return;
    const newSelected = new Set(selected);
    if (newSelected.has(regionId)) {
      newSelected.delete(regionId);
    } else {
      newSelected.add(regionId);
    }
    onChange(Array.from(newSelected).join(','));
  };

  const view = question.type === 'bodymap' && 'view' in question ? question.view : 'front';
  const imageSrc = view === 'back'
    ? '/images/silueta_back.jpg'
    : '/images/silueta_front.jpg';

  return (
    <div>
      <label className="block text-sm text-slate-700 mb-2">{getText(question.label, lang)}</label>
      <div className="relative inline-block">
        <img
          src={imageSrc}
          alt={`Body map ${view}`}
          className="max-w-full h-auto"
          style={{ maxHeight: '400px' }}
        />
        {bodymapRegions.filter(r => r.views.includes(view as 'front' | 'back')).map((region) => {
          const isActive = selected.has(region.id);
          const pos = view === 'back' ? region.back : region.front;
          if (!pos) return null;
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => handleRegionClick(region.id)}
              disabled={disabled}
              className={`absolute w-5 h-5 rounded-full border-2 shadow-sm transition-colors ${
                isActive
                  ? 'bg-red-500 border-red-700'
                  : 'bg-white/90 border-slate-400 hover:border-red-400 hover:bg-red-50'
              } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              style={{
                top: pos.top,
                left: pos.left,
                transform: 'translate(-50%, -50%)',
              }}
              title={region.label}
            />
          );
        })}
      </div>
      <p className="text-xs text-slate-500 mt-2">Click dots to toggle discomfort areas.</p>
    </div>
  );
}

interface FormQuestionProps {
  question: QuestionnaireQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
  lang: FormLang;
}

function FormQuestion({ question, value, onChange, disabled, lang }: FormQuestionProps): React.JSX.Element {
  const requiredMark = question.required ? <span className="text-red-500 ml-0.5">*</span> : null;
  const labelText = getText(question.label, lang);

  if (question.type === 'yes_no') {
    return (
      <div>
        <label className="block text-sm text-slate-700 mb-2">{labelText}{requiredMark}</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={question.id}
              checked={value === 'Yes' || value === true}
              onChange={() => onChange('Yes')}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-slate-700">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={question.id}
              checked={value === 'No' || value === false}
              onChange={() => onChange('No')}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-slate-700">No</span>
          </label>
        </div>
      </div>
    );
  }

  if (question.type === 'textarea') {
    const textValue = typeof value === 'string' ? value : '';
    return (
      <div>
        <label className="block text-sm text-slate-700 mb-2">{labelText}</label>
        <textarea
          value={textValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  }

  if (question.type === 'checkbox') {
    const isChecked = value === 'Yes' || value === true;
    return (
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onChange(e.target.checked ? 'Yes' : 'No')}
            disabled={disabled}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm text-slate-700">{labelText}{requiredMark}</span>
        </label>
      </div>
    );
  }

  if (question.type === 'date') {
    const todayValue = question.default === 'today' ? new Date().toISOString().slice(0, 10) : '';
    const dateValue = typeof value === 'string' && value ? value : todayValue;
    const isReadOnly = question.default === 'today';
    return (
      <div>
        <label className="block text-sm text-slate-700 mb-2">{labelText}</label>
        <input
          type="date"
          value={dateValue}
          onChange={isReadOnly ? undefined : (e) => onChange(e.target.value)}
          readOnly={isReadOnly}
          disabled={disabled}
          className="w-auto px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 read-only:bg-slate-50 read-only:cursor-default"
        />
      </div>
    );
  }

  if (question.type === 'select') {
    const options = question.options ?? [];
    const currentValue = value === undefined || value === null ? '' : String(value);
    return (
      <div>
        <label className="block text-sm text-slate-700 mb-2">{labelText}{requiredMark}</label>
        <select
          value={currentValue}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? undefined : v);
          }}
          disabled={disabled}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {options.map((opt) => (
            <option key={opt.value === '' ? '__empty__' : opt.value} value={opt.value}>
              {getText(opt.label, lang) || '\u2014'}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (question.type === 'bodymap') {
    return (
      <BodyMapQuestion
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
        lang={lang}
      />
    );
  }

  if (question.type === 'multi_select') {
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
    const hasOther = question.options?.some(opt => opt.value === 'other');
    const otherValue = selectedValues.find(v => typeof v === 'object' && v !== null && 'other' in v) as { other: string } | undefined;
    const isOtherSelected = otherValue !== undefined;

    const handleOptionChange = (optionValue: string, checked: boolean): void => {
      if (disabled) return;
      const newSelected = [...selectedValues];
      if (optionValue === 'other') {
        if (checked) {
          newSelected.push({ other: '' });
        } else {
          const index = newSelected.findIndex(v => typeof v === 'object' && v !== null && 'other' in v);
          if (index !== -1) newSelected.splice(index, 1);
        }
      } else {
        if (checked) {
          newSelected.push(optionValue);
        } else {
          const index = newSelected.indexOf(optionValue);
          if (index !== -1) newSelected.splice(index, 1);
        }
      }
      onChange(newSelected);
    };

    const handleOtherTextChange = (text: string): void => {
      if (disabled || !isOtherSelected) return;
      const newSelected = selectedValues.filter(v => typeof v !== 'object' || v === null || !('other' in v));
      if (text.trim() || isOtherSelected) {
        newSelected.push({ other: text });
      }
      onChange(newSelected);
    };

    return (
      <div>
        <label className="block text-sm text-slate-700 mb-2">{labelText}</label>
        <div className="space-y-2">
          {question.options?.map((option) => {
            const isChecked = option.value === 'other' 
              ? isOtherSelected
              : selectedValues.includes(option.value);
            
            return (
              <label key={option.value} className="flex items-start gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => handleOptionChange(option.value, e.target.checked)}
                  disabled={disabled}
                  className="mt-1 w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700 flex-1">{getText(option.label, lang)}</span>
              </label>
            );
          })}
          {hasOther && (
            <div className="ml-6 mt-2">
              <textarea
                value={otherValue?.other || ''}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                disabled={disabled || !isOtherSelected}
                placeholder="Specify other..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const inputValue = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  return (
    <div>
      <label className="block text-sm text-slate-700 mb-2">{labelText}{requiredMark}</label>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export interface FormQuestionnaireProps {
  questionnaire: Questionnaire;
  answers: AnswersMap;
  onAnswer: (id: string, value: unknown) => void;
  onSubmit: () => void;
  submitted: boolean;
  submitLabel?: string;
  lang?: FormLang;
}

export function FormQuestionnaire({ questionnaire, answers, onAnswer, onSubmit, submitted, submitLabel, lang = 'en' }: FormQuestionnaireProps): React.JSX.Element {
  const canSubmit = questionnaire.sections.every(section =>
    section.questions
      .filter(q => isQuestionVisible(q, answers))
      .every(q => {
        if (!q.required) return true;
        const val = answers[q.id];
        if (q.type === 'yes_no') return val === 'Yes' || val === 'No';
        if (q.type === 'checkbox') return val === 'Yes' || val === true;
        if (q.type === 'text') return typeof val === 'string' && val.trim().length > 0;
        if (q.type === 'select') return typeof val === 'string' && val.trim().length > 0;
        return true;
      })
  );

  return (
    <div className="space-y-6">
      {questionnaire.sections.map((section, sectionIdx) => {
        const visibleQuestions = section.questions.filter(q => isQuestionVisible(q, answers));
        if (visibleQuestions.length === 0) return null;

        const groupedQuestions: Array<{ type: 'single' | 'bodymap-group'; questions: QuestionnaireQuestion[] }> = [];
        let currentGroup: QuestionnaireQuestion[] = [];
        let isBodymapGroup = false;

        visibleQuestions.forEach((q) => {
          if (q.type === 'bodymap') {
            if (!isBodymapGroup) {
              if (currentGroup.length > 0) {
                groupedQuestions.push({ type: 'single', questions: currentGroup });
                currentGroup = [];
              }
              isBodymapGroup = true;
            }
            currentGroup.push(q);
          } else {
            if (isBodymapGroup) {
              groupedQuestions.push({ type: 'bodymap-group', questions: currentGroup });
              currentGroup = [];
              isBodymapGroup = false;
            }
            currentGroup.push(q);
          }
        });

        if (currentGroup.length > 0) {
          groupedQuestions.push({
            type: isBodymapGroup ? 'bodymap-group' : 'single',
            questions: currentGroup
          });
        }

        // Determine tag color based on section title (use EN key for consistency)
        const sectionTitleStr = getText(section.title, lang);
        const getTagColor = (title: string): "bg-blue-100 text-blue-700" | "bg-green-100 text-green-700" | "bg-orange-100 text-orange-700" | null => {
          if (title === 'Sagittal') {
            return 'bg-blue-100 text-blue-700';
          } else if (title === 'Frontal') {
            return 'bg-green-100 text-green-700';
          } else if (title === 'Transverse') {
            return 'bg-orange-100 text-orange-700';
          }
          return null;
        };

        const tagColor = getTagColor(getText(section.title, 'en'));
        const showTag = tagColor !== null;

        return (
          <div key={sectionIdx} className="bg-white rounded-xl border border-slate-200 p-6">
            {showTag ? (
              <span className={`text-xs px-3 py-1 rounded-full ${tagColor} inline-block mb-4`}>
                {sectionTitleStr}
              </span>
            ) : (
              <h3 className="text-slate-900 mb-2">{sectionTitleStr}</h3>
            )}
            {section.description && (
              <p className="text-sm text-slate-600 mb-4">{getText(section.description, lang)}</p>
            )}
            <div className="space-y-4">
              {groupedQuestions.map((group, groupIdx) => {
                if (group.type === 'bodymap-group') {
                  return (
                    <div key={groupIdx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.questions.map((q) => (
                        <FormQuestion
                          key={q.id}
                          question={q}
                          value={answers[q.id]}
                          onChange={(value) => onAnswer(q.id, value)}
                          disabled={submitted}
                          lang={lang}
                        />
                      ))}
                    </div>
                  );
                }
                return group.questions.map((q) => (
                  <FormQuestion
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(value) => onAnswer(q.id, value)}
                    disabled={submitted}
                    lang={lang}
                  />
                ));
              })}
            </div>
          </div>
        );
      })}

      {!submitted && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Progress saved automatically
          </div>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLabel ?? 'Submit Assessment'}
          </button>
        </div>
      )}

      {submitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-emerald-900 font-medium">Assessment Submitted</span>
          </div>
          <p className="text-sm text-emerald-700">
            Your responses have been recorded. Use the Export buttons to save your results.
          </p>
        </div>
      )}
    </div>
  );
}

export function Questionnaires({ onBack, questionnaires, initialSelection = null }: QuestionnairesProps): React.JSX.Element {
  // Auto-select if initialSelection provided or if only one questionnaire exists
  const getInitialSelection = (): string | null => {
    if (initialSelection) return initialSelection;
    const keys = Object.keys(questionnaires);
    if (keys.length === 1) return keys[0];
    return null;
  };
  
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string | null>(getInitialSelection);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [sendToClientData, setSendToClientData] = useState<{ id: string; name: string } | null>(null);

  const questionnaire = selectedQuestionnaire ? questionnaires[selectedQuestionnaire] : null;
  
  // Sync with initialSelection prop changes
  useEffect(() => {
    if (initialSelection && selectedQuestionnaire !== initialSelection) {
      setSelectedQuestionnaire(initialSelection);
    }
  }, [initialSelection, selectedQuestionnaire]);

  // Load saved progress
  useEffect(() => {
    if (selectedQuestionnaire && questionnaire) {
      const saved = loadSavedQuestionnaire(questionnaire.abbreviation ?? selectedQuestionnaire);
      if (saved) {
        setAnswers(saved.answers ?? {});
        setSubmitted(saved.submitted ?? false);
      }
    }
  }, [selectedQuestionnaire, questionnaire]);

  // Autosave on answer change
  useEffect(() => {
    if (selectedQuestionnaire && questionnaire && Object.keys(answers).length > 0) {
      autosaveQuestionnaire(questionnaire.abbreviation ?? selectedQuestionnaire, answers, submitted);
    }
  }, [answers, submitted, selectedQuestionnaire, questionnaire]);

  const handleAnswer = (questionId: string, value: unknown): void => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (): void => {
    setSubmitted(true);
    if (questionnaire) {
      autosaveQuestionnaire(questionnaire.abbreviation ?? selectedQuestionnaire ?? '', answers, true);
    }
  };

  const handleReset = (): void => {
    if (questionnaire && confirm('Are you sure you want to reset this questionnaire?')) {
      const abbr = questionnaire.abbreviation ?? selectedQuestionnaire ?? '';
      localStorage.removeItem(`questionnaire_${abbr}`);
      setAnswers({});
      setSubmitted(false);
    }
  };

  const handleSaveProgress = (): void => {
    if (questionnaire) {
      autosaveQuestionnaire(questionnaire.abbreviation ?? selectedQuestionnaire ?? '', answers, submitted);
      alert('Progress saved locally.');
    }
  };

  const handleExportCSV = (): void => {
    if (!questionnaire) return;
    const rows = [['Question', 'Answer']];
    questionnaire.sections.forEach(section => {
      section.questions.forEach(question => {
        const answer = formatFormAnswer(question, answers[question.id], 'en');
        rows.push([getText(question.label, 'en'), answer ?? '-']);
      });
    });

    const csv = rows.map(r => r.map(x => '"' + (x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const abbr = questionnaire.abbreviation ?? selectedQuestionnaire ?? 'questionnaire';
    a.download = `${abbr}_result.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = (): void => {
    if (!questionnaire) return;
    const pdf = buildQuestionnairePDF(questionnaire, answers, selectedQuestionnaire, 'en');
    if (pdf) {
      pdf.doc.save(pdf.filename);
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!questionnaire) return;
    const summary = buildQuestionnaireSummary(questionnaire, answers);

    if (navigator.share) {
      try {
        const pdf = buildPDFBlob(questionnaire, answers, selectedQuestionnaire);
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

  const updateClearanceNotice = (): boolean => {
    if (!questionnaire?.showClearanceNotice) return false;
    const yesNoIds = questionnaire.sections
      .flatMap(section => section.questions)
      .filter(question => question.type === 'yes_no' && question.id !== 'parq_activity_level')
      .map(question => question.id);
    return yesNoIds.some(id => answers[id] === 'Yes' || answers[id] === true);
  };

  const showClearance = updateClearanceNotice();

  if (questionnaire) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    setSelectedQuestionnaire(null);
                    setAnswers({});
                    setSubmitted(false);
                    onBack();
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="min-w-0">
                  <div className="truncate text-slate-900">{getText(questionnaire.name, 'en')}</div>
                  {questionnaire.description && (
                    <div className="line-clamp-2 text-xs leading-snug text-slate-500 sm:line-clamp-1">
                      {getText(questionnaire.description, 'en')}
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-11 flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-2">
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
                  onClick={handleSaveProgress}
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Save Progress"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Clearance Notice */}
          {showClearance && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    You answered YES to at least one readiness question. Consider medical clearance before starting a vigorous program.
                  </p>
                </div>
              </div>
            </div>
          )}

          <FormQuestionnaire
            questionnaire={questionnaire}
            answers={answers}
            onAnswer={handleAnswer}
            onSubmit={handleSubmit}
            submitted={submitted}
          />
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
                <div className="text-slate-900">Questionnaires</div>
                <div className="text-xs text-slate-500">Assessment Forms</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-slate-900 mb-2">Available Questionnaires</h2>
          <p className="text-slate-600">
            Select a questionnaire to begin assessment
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(questionnaires)
            .filter(([id]) => id !== 'gsma' && id !== 'lbmjma' && id !== 'ubmjma' && id !== 'oasma' && id !== 'sjma')
            .map(([id, q]) => (
            <div
              key={id}
              className="bg-white rounded-xl border border-slate-200 p-6 text-left flex flex-col"
            >
              <div className="mb-4">
                <h3 className="text-slate-900 mb-1">{getText(q.name, 'en')}</h3>
                {q.abbreviation && (
                  <span className="text-xs text-slate-500">({q.abbreviation})</span>
                )}
              </div>
              {q.description && (
                <p className="text-sm text-slate-600 mb-4 flex-1">{getText(q.description, 'en')}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuestionnaire(id)}
                  className="flex items-center gap-2 text-blue-600 text-sm hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors -ml-1"
                >
                  Start Assessment →
                </button>
                <button
                  type="button"
                  onClick={() => setSendToClientData({ id, name: getText(q.name, 'en') })}
                  className="flex items-center gap-1.5 text-sm text-orange-600 hover:bg-orange-50 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Send to Client
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
          formType="questionnaire"
          formName={sendToClientData.name}
        />
      )}
    </div>
  );
}
