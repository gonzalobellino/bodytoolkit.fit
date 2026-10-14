import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public/data');
const errors = [];
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
  } catch (error) {
    errors.push(`${name}: ${error.message}`);
    return null;
  }
}

function array(value, label) {
  if (Array.isArray(value)) return value;
  errors.push(`${label}: expected an array`);
  return [];
}

function text(value, label) {
  if (!nonempty(value)) errors.push(`${label}: expected a nonempty string`);
}

function stringArray(value, label) {
  for (const [index, item] of array(value, label).entries()) text(item, `${label}[${index}]`);
}

function translatable(value, label) {
  if (!isObject(value)) {
    errors.push(`${label}: expected { en, es }`);
    return;
  }
  text(value.en, `${label}.en`);
  text(value.es, `${label}.es`);
}

const patterns = array(read('patterns.json'), 'patterns.json');
const assessments = array(read('assessments.json'), 'assessments.json');
const conditions = array(read('conditions.json'), 'conditions.json');
const rawExercises = read('exercises.json');
if (!isObject(rawExercises)) errors.push('exercises.json: expected categories object');
const exercises = Object.entries(isObject(rawExercises) ? rawExercises : {}).flatMap(([category, values]) =>
  array(values, `exercises.json.${category}`)
);
const collections = { p: patterns, a: assessments, e: exercises, c: conditions };
const ids = {};
const allIds = new Set();
const fields = {
  p: { strings: ['name', 'category', 'biomechanical_mechanism', 'clinical_rationale'], arrays: ['common_compensations', 'progression', 'regression', 'red_flags', 'assessment_ids', 'exercise_ids'] },
  a: { strings: ['name', 'category', 'description', 'purpose'], arrays: ['execution', 'views', 'key_observations', 'protocol'] },
  e: { strings: ['name', 'target', 'description'], arrays: ['execution', 'cues', 'common_errors', 'progressions'] },
  c: { strings: ['name', 'category', 'overview', 'biomechanical_mechanism', 'clinical_rationale', 'practical_solution'], arrays: ['common_compensations', 'correctives', 'progression', 'regression', 'red_flags', 'differential_diagnosis', 'assessment_ids', 'exercise_ids'] },
};

for (const [prefix, items] of Object.entries(collections)) {
  ids[prefix] = new Set();
  for (const [index, item] of items.entries()) {
    const label = `${prefix}[${index}]`;
    if (!isObject(item)) {
      errors.push(`${label}: expected object`);
      continue;
    }
    if (typeof item.id !== 'string' || !new RegExp(`^${prefix}__[a-z0-9_]+$`).test(item.id)) {
      errors.push(`${label}.id: expected ${prefix}__ followed by lowercase letters, digits, or underscores`);
    } else {
      if (allIds.has(item.id)) errors.push(`${label}.id: duplicate ${item.id}`);
      allIds.add(item.id);
      ids[prefix].add(item.id);
    }
    for (const field of fields[prefix].strings) text(item[field], `${label}.${field}`);
    for (const field of fields[prefix].arrays) stringArray(item[field], `${label}.${field}`);
  }
}

const references = { assessment_ids: 'a', exercise_ids: 'e', condition_ids: 'c', related_patterns: 'p', pattern_ids: 'p' };
for (const [prefix, items] of Object.entries(collections)) {
  for (const item of items) {
    if (!isObject(item)) continue;
    for (const [field, target] of Object.entries(references)) {
      if (item[field] === undefined) continue;
      const refs = array(item[field], `${item.id}.${field}`);
      if (refs.length !== new Set(refs).size) errors.push(`${item.id}.${field}: duplicate reference`);
      for (const ref of refs) {
        if (!ids[target].has(ref)) errors.push(`${item.id}.${field}: unknown ${ref}`);
      }
    }
  }
}

const quizTypes = new Set(['identify', 'corrective', 'trueFalse', 'compensation', 'progression', 'biomechanical_mechanism', 'views', 'protocol', 'observation', 'origin_insertion', 'muscle_identification', 'region_selection']);
const quizSources = new Set(['patterns.json', 'assessments.json', 'muscleCharts.json']);
const topics = array(read('quizTopics.json'), 'quizTopics.json');
const topicIds = new Set();
for (const [index, topic] of topics.entries()) {
  const label = `quizTopics.json[${index}]`;
  if (!isObject(topic)) { errors.push(`${label}: expected object`); continue; }
  text(topic.id, `${label}.id`);
  if (topicIds.has(topic.id)) errors.push(`${label}.id: duplicate ${topic.id}`);
  topicIds.add(topic.id);
  text(topic.title, `${label}.title`);
  text(topic.timeEstimate, `${label}.timeEstimate`);
  if (!Number.isInteger(topic.questionCount) || topic.questionCount < 1) errors.push(`${label}.questionCount: expected positive integer`);
  if (!['Beginner', 'Intermediate', 'Advanced'].includes(topic.difficulty)) errors.push(`${label}.difficulty: unsupported value`);
  if (!quizSources.has(topic.knowledgeBase)) errors.push(`${label}.knowledgeBase: generator does not support ${topic.knowledgeBase}`);
  const types = array(topic.questionTypes, `${label}.questionTypes`);
  if (!types.length) errors.push(`${label}.questionTypes: must not be empty`);
  for (const type of types) if (!quizTypes.has(type)) errors.push(`${label}.questionTypes: unsupported ${type}`);
}

const expectedForms = new Set(['client-questionnaire.json', 'physical-activity-readiness.json', 'lefs.json', 'uefi.json']);
const remainingJson = fs.readdirSync(dataDir).filter((name) => name.endsWith('.json') &&
  !['patterns.json', 'assessments.json', 'exercises.json', 'conditions.json', 'quizTopics.json'].includes(name));
const otherData = new Map(remainingJson.map((name) => [name, read(name)]));
const formFiles = remainingJson.filter((name) => expectedForms.has(name) || name.startsWith('movement-analysis-') ||
  ['form', 'scale'].includes(otherData.get(name)?.type));
for (const name of formFiles) {
  const form = otherData.get(name);
  if (!isObject(form)) { errors.push(`${name}: expected object`); continue; }
  translatable(form.name, `${name}.name`);
  if (form.type === 'form') {
    if (form.description !== undefined) translatable(form.description, `${name}.description`);
    const questionIds = new Set();
    for (const [sectionIndex, section] of array(form.sections, `${name}.sections`).entries()) {
      const label = `${name}.sections[${sectionIndex}]`;
      if (!isObject(section)) { errors.push(`${label}: expected object`); continue; }
      translatable(section.title, `${label}.title`);
      if (section.description !== undefined) translatable(section.description, `${label}.description`);
      for (const [questionIndex, question] of array(section.questions, `${label}.questions`).entries()) {
        const q = `${label}.questions[${questionIndex}]`;
        if (!isObject(question)) { errors.push(`${q}: expected object`); continue; }
        text(question.id, `${q}.id`);
        if (questionIds.has(question.id)) errors.push(`${q}.id: duplicate ${question.id}`);
        questionIds.add(question.id);
        translatable(question.label, `${q}.label`);
        if (question.options !== undefined) {
          for (const [optionIndex, option] of array(question.options, `${q}.options`).entries()) {
            const o = `${q}.options[${optionIndex}]`;
            if (!isObject(option)) { errors.push(`${o}: expected object`); continue; }
            if (typeof option.value !== 'string') errors.push(`${o}.value: expected string`);
            translatable(option.label, `${o}.label`);
          }
        }
      }
    }
  } else if (form.type === 'scale') {
    if (!Number.isFinite(form.minScore) || !Number.isFinite(form.maxScore) || form.maxScore < form.minScore) errors.push(`${name}: invalid score range`);
    for (const [index, question] of array(form.questions, `${name}.questions`).entries()) translatable(question, `${name}.questions[${index}]`);
    for (const [index, option] of array(form.options, `${name}.options`).entries()) {
      if (!isObject(option) || !Number.isFinite(option.value)) errors.push(`${name}.options[${index}].value: expected number`);
      translatable(option?.label, `${name}.options[${index}].label`);
    }
  } else errors.push(`${name}.type: expected form or scale`);
}

const patternById = new Map(patterns.filter(isObject).map((item) => [item.id, item]));
const asymmetry = exercises.filter(isObject).flatMap((exercise) => (exercise.pattern_ids ?? [])
  .filter((id) => patternById.has(id) && !patternById.get(id).exercise_ids?.includes(exercise.id))
  .map((id) => `${exercise.id} -> ${id}`));
if (asymmetry.length) errors.push(`${asymmetry.length} exercise-to-pattern links lack reverse links:\n${asymmetry.join('\n')}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`data ok (${patterns.length} patterns, ${assessments.length} assessments, ${exercises.length} exercises, ${conditions.length} conditions, ${topics.length} quiz topics, ${formFiles.length} forms/scales)`);
}
