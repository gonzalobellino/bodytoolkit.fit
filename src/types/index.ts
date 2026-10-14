// ============================================
// DATA TYPE DEFINITIONS
// ============================================
// These types define the structure for all JSON data files
// Place your JSON files in /public/data/ directory

export interface Pattern {
  id: string;
  name: string;
  category: string;
  description?: string;
  overview?: string;
  biomechanical_mechanism: string;
  clinical_rationale: string;
  evidence?: {
    description?: string;
    level?: string;
    summary?: string;
    pubmed_links?: string[];
    sources?: Array<{
      title: string;
      url: string;
      type: string;
      doi?: string;
      doi_url?: string;
    }>;
  };
  common_compensations: string[];
  correctives?: string[];
  progression: string[];
  regression: string[];
  red_flags: string[];
  assessment_ids: string[];
  exercise_ids: string[];
  condition_ids?: string[];
  practical_solution?: string;
  differential_diagnosis?: string[];
  related_patterns?: string[];
  images?: string[];
  videos?: string[];
}

export interface Assessment {
  id: string;
  name: string;
  category: string;
  description: string;
  purpose: string;
  execution: string[];
  views: string[];
  key_observations: string[];
  positive_indicators: Record<string, string>;
  protocol: string[];
  reference?: string;
}

export interface Exercise {
  id: string;
  name: string;
  target: string;
  description: string;
  execution: string[];
  cues: string[];
  common_errors: string[];
  progressions: string[];
  reference?: string;
  category?: string;
}

export interface ExercisesByCategory {
  [category: string]: Exercise[];
}

export interface Condition {
  id: string;
  name: string;
  category: string;
  overview: string;
  biomechanical_mechanism: string;
  clinical_rationale: string;
  practical_solution: string;
  common_compensations: string[];
  correctives: string[];
  progression: string[];
  regression: string[];
  red_flags: string[];
  differential_diagnosis: string[];
  assessment_ids: string[];
  exercise_ids: string[];
}

export type QuizQuestionType = 
  | 'identify' 
  | 'corrective' 
  | 'trueFalse' 
  | 'compensation' 
  | 'progression' 
  | 'biomechanical_mechanism'
  | 'views' 
  | 'protocol' 
  | 'observation'
  | 'origin_insertion' 
  | 'muscle_identification' 
  | 'region_selection';

export interface QuizQuestion {
  id: string;
  type?: QuizQuestionType;
  question: string;
  options: string[];
  correct: number | number[]; // Support for multiselect
  explanation: string;
}

export interface QuizQuestionsByTopic {
  [topicId: string]: QuizQuestion[];
}

export interface QuizTopic {
  id: string;
  title: string;
  questionCount: number; // Changed from 'questions' to 'questionCount'
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeEstimate: string;
  knowledgeBase: string; // e.g., "patterns.json", "assessments.json", "muscleCharts.json"
  questionTypes: QuizQuestionType[]; // Types of questions to generate
}

export interface ClinicalCase {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  scenario: string;
  presentation: string[];
  redFlags: string[];
  presentRedFlags: string[];
  correctDecision: 'safe_to_train' | 'refer_to_medical' | 'modify_with_caution';
  explanation: string;
  recommendedApproach: string[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  bodyParts: string[];
  related: string[];
}

export interface GlossaryTerms {
  [key: string]: GlossaryEntry;
}

// Form language: client-facing forms (send-by-link) support EN and ES only. No fallback.
export type FormLang = 'en' | 'es';

/** All user-facing text in form JSONs must be this shape. Both keys required. */
export interface Translatable {
  en: string;
  es: string;
}

// Questionnaire (form type: Client Questionnaire, PAR-Q)
export interface Questionnaire {
  id?: string;
  name: Translatable;
  abbreviation?: string;
  description?: Translatable;
  type: 'form';
  domain?: string;
  showClearanceNotice?: boolean;
  sections: Array<{
    title: Translatable;
    description?: Translatable;
    questions: Array<{
      id: string;
      type: 'text' | 'yes_no' | 'textarea' | 'checkbox' | 'date' | 'bodymap' | 'multi_select' | 'select';
      label: Translatable;
      required?: boolean;
      default?: string;
      view?: 'front' | 'back';
      options?: Array<{
        value: string;
        label: Translatable;
      }>;
      /** When set, question is only shown when the answer to questionId matches one of values (case-insensitive). */
      showWhen?: { questionId: string; values: string[] };
    }>;
  }>;
}

// Functional Scale (scale type: LEFS, UEFI)
export interface FunctionalScale {
  id?: string;
  name: Translatable;
  abbreviation: string;
  type: 'scale';
  maxScore: number;
  minScore: number;
  questions: Translatable[];
  options: Array<{
    value: number;
    label: Translatable;
  }>;
}

