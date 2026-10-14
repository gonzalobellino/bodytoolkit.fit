import type { FunctionalScale, Questionnaire, Translatable } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const optional = (value: unknown, guard: (value: unknown) => boolean): boolean =>
  value === undefined || guard(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

export function isTranslatable(value: unknown): value is Translatable {
  return isRecord(value) && isString(value.en) && isString(value.es);
}

const questionTypes = new Set([
  'text', 'yes_no', 'textarea', 'checkbox', 'date', 'bodymap', 'multi_select', 'select',
]);

function isQuestionOption(value: unknown): boolean {
  return isRecord(value) && isString(value.value) && isTranslatable(value.label);
}

function isQuestion(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const condition = value.showWhen;
  return isString(value.id) && isString(value.type) && questionTypes.has(value.type)
    && isTranslatable(value.label)
    && optional(value.required, (item) => typeof item === 'boolean')
    && optional(value.default, isString)
    && optional(value.view, (item) => item === 'front' || item === 'back')
    && optional(value.options, (item) => Array.isArray(item) && item.every(isQuestionOption))
    && optional(condition, (item) => isRecord(item)
      && isString(item.questionId) && isStringArray(item.values));
}

function isSection(value: unknown): boolean {
  return isRecord(value) && isTranslatable(value.title)
    && optional(value.description, isTranslatable)
    && Array.isArray(value.questions) && value.questions.every(isQuestion);
}

export function isQuestionnaire(value: unknown): value is Questionnaire {
  return isRecord(value) && value.type === 'form'
    && optional(value.id, isString)
    && isTranslatable(value.name)
    && optional(value.abbreviation, isString)
    && optional(value.description, isTranslatable)
    && optional(value.domain, isString)
    && optional(value.showClearanceNotice, (item) => typeof item === 'boolean')
    && Array.isArray(value.sections) && value.sections.every(isSection);
}

function isScaleOption(value: unknown): boolean {
  return isRecord(value) && typeof value.value === 'number'
    && Number.isFinite(value.value) && isTranslatable(value.label);
}

export function isFunctionalScale(value: unknown): value is FunctionalScale {
  return isRecord(value) && value.type === 'scale'
    && optional(value.id, isString)
    && isTranslatable(value.name) && isString(value.abbreviation)
    && typeof value.minScore === 'number' && Number.isFinite(value.minScore)
    && typeof value.maxScore === 'number' && Number.isFinite(value.maxScore)
    && value.maxScore >= value.minScore
    && Array.isArray(value.questions) && value.questions.every(isTranslatable)
    && Array.isArray(value.options) && value.options.every(isScaleOption);
}
