// ============================================
// DATA LOADER UTILITIES
// ============================================
// Functions to load JSON data from /public/data/ directory

import type {
  Pattern,
  Assessment,
  ExercisesByCategory,
  Condition,
  QuizQuestionsByTopic,
  QuizTopic,
  GlossaryTerms,
  Questionnaire,
  FunctionalScale
} from '../types';
import { isFunctionalScale, isQuestionnaire } from './formGuards';

export interface MuscleChart {
  muscle: string;
  origin: string;
  insertion: string;
  section: string;
  subsection?: string;
}

export interface MuscleChartsData {
  metadata: {
    source: string;
    total_muscles: number;
  };
  muscles_by_section: {
    [section: string]: MuscleChart[];
  };
  all_muscles: MuscleChart[];
}

/**
 * Loads patterns from JSON file
 * Expected location: /public/data/patterns.json
 */
export async function loadPatterns(): Promise<Pattern[]> {
  try {
    const response = await fetch('/data/patterns.json');
    if (!response.ok) {
      console.warn('Patterns JSON not found, using empty array');
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading patterns:', error);
    return [];
  }
}

/**
 * Loads assessments from JSON file
 * Expected location: /public/data/assessments.json
 */
export async function loadAssessments(): Promise<Assessment[]> {
  try {
    const response = await fetch('/data/assessments.json');
    if (!response.ok) {
      console.warn('Assessments JSON not found, using empty array');
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading assessments:', error);
    return [];
  }
}

/**
 * Loads exercises from JSON file
 * Expected location: /public/data/exercises.json
 */
export async function loadExercises(): Promise<ExercisesByCategory> {
  try {
    const response = await fetch('/data/exercises.json');
    if (!response.ok) {
      console.warn('Exercises JSON not found, using empty object');
      return {};
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading exercises:', error);
    return {};
  }
}

/**
 * Loads conditions from JSON file
 * Expected location: /public/data/conditions.json
 */
export async function loadConditions(): Promise<Condition[]> {
  try {
    const response = await fetch('/data/conditions.json');
    if (!response.ok) {
      console.warn('Conditions JSON not found, using empty array');
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading conditions:', error);
    return [];
  }
}

/**
 * Loads glossary from JSON file
 * Expected location: /public/data/glossary.json
 */
export async function loadGlossary(): Promise<GlossaryTerms> {
  try {
    const response = await fetch('/data/glossary.json');
    if (!response.ok) {
      console.warn('Glossary JSON not found, using empty object');
      return {};
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading glossary:', error);
    return {};
  }
}

/**
 * Loads muscle charts from JSON file
 * Expected location: /public/data/muscleCharts.json
 */
export async function loadMuscleCharts(): Promise<MuscleChartsData | null> {
  try {
    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(`/data/muscleCharts.json${cacheBuster}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    if (!response.ok) {
      console.warn('Muscle charts JSON not found');
      return null;
    }
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.warn('Muscle charts response is not JSON');
      return null;
    }
    const text = await response.text();
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.warn('Muscle charts response is HTML (SPA fallback)');
      return null;
    }
    return JSON.parse(text) as MuscleChartsData;
  } catch (error) {
    console.error('Error loading muscle charts:', error);
    return null;
  }
}

/**
 * Loads quiz questions from JSON file (DEPRECATED - removed)
 * Questions are now generated dynamically from knowledge bases
 * This function returns empty object for backward compatibility only
 */
export async function loadQuizQuestions(): Promise<QuizQuestionsByTopic> {
  // Questions are now generated dynamically from knowledge bases
  // This function is kept for backward compatibility but always returns empty object
  return {};
}

/**
 * Loads quiz topics metadata from JSON file
 * Expected location: /public/data/quizTopics.json
 */
export async function loadQuizTopics(): Promise<QuizTopic[]> {
  try {
    // Add cache-busting query parameter to avoid service worker caching issues
    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(`/data/quizTopics.json${cacheBuster}`, {
      cache: 'no-store', // Bypass service worker cache
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    if (!response.ok) {
      console.warn('Quiz topics JSON not found, using empty array');
      return [];
    }
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.warn('Quiz topics response is not JSON (got ' + contentType + '), using empty array');
      return [];
    }
    const text = await response.text();
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.warn('Quiz topics response is HTML (SPA fallback), using empty array');
      return [];
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Error loading quiz topics:', error);
    return [];
  }
}

/**
 * Loads a questionnaire or scale by file name
 */
async function loadDataFile(file: string): Promise<unknown | null> {
  try {
    const response = await fetch(`/data/${file}.json`);
    if (!response.ok) {
      console.warn(`File ${file} not found`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading ${file}:`, error);
    return null;
  }
}

/**
 * Loads all questionnaires (form type: Client Questionnaire, PAR-Q, Movement Analysis Forms)
 */
export async function loadAllQuestionnaires(): Promise<Record<string, Questionnaire>> {
  const questionnaireFiles = [
    { file: 'client-questionnaire', key: 'cq' },
    { file: 'physical-activity-readiness', key: 'parq' },
    { file: 'movement-analysis-goblet-squat', key: 'gsma' },
    { file: 'movement-analysis-lower-body', key: 'lbmjma' },
    { file: 'movement-analysis-upper-body', key: 'ubmjma' },
    { file: 'movement-analysis-shoulder-press', key: 'oasma' },
    { file: 'movement-analysis-single-joint', key: 'sjma' }
  ];
  const questionnaires: Record<string, Questionnaire> = {};
  
  await Promise.all(
    questionnaireFiles.map(async ({ file, key }) => {
      try {
        const data = await loadDataFile(file);
        if (isQuestionnaire(data)) questionnaires[key] = { ...data, id: key };
        else console.warn(`Invalid questionnaire ${file}`);
      } catch (error) {
        console.warn(`Failed to load questionnaire ${file}:`, error);
      }
    })
  );
  
  return questionnaires;
}

/**
 * Loads all functional scales (scale type: LEFS, UEFI)
 */
export async function loadAllFunctionalScales(): Promise<Record<string, FunctionalScale>> {
  const scaleFiles = [
    'lefs',
    'uefi'
  ];
  const scales: Record<string, FunctionalScale> = {};
  
  await Promise.all(
    scaleFiles.map(async (file) => {
      try {
        const data = await loadDataFile(file);
        if (isFunctionalScale(data)) {
          const key = data.abbreviation ? data.abbreviation.toLowerCase() : file;
          scales[key] = { ...data, id: key };
        } else console.warn(`Invalid functional scale ${file}`);
      } catch (error) {
        console.warn(`Failed to load functional scale ${file}:`, error);
      }
    })
  );
  
  return scales;
}

/**
 * Loads all data at once
 */
export async function loadAllData() {
  const [
    patterns,
    assessments,
    exercises,
    conditions,
    glossary,
    quizQuestions,
    quizTopics,
    questionnaires,
    functionalScales,
    muscleCharts
  ] = await Promise.all([
    loadPatterns(),
    loadAssessments(),
    loadExercises(),
    loadConditions(),
    loadGlossary(),
    loadQuizQuestions(),
    loadQuizTopics(),
    loadAllQuestionnaires(),
    loadAllFunctionalScales(),
    loadMuscleCharts()
  ]);

  return {
    patterns,
    assessments,
    exercises,
    conditions,
    glossary,
    quizQuestions,
    quizTopics,
    questionnaires,
    functionalScales,
    muscleCharts
  };
}
