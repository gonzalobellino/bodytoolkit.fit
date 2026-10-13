// ============================================
// Dynamic Quiz Question Generator
// ============================================
// Generates quiz questions dynamically from knowledge bases
// Uses non-deterministic language to avoid medical prescriptive claims

import type { Pattern, Assessment, ExercisesByCategory } from '../types';
import type { QuizQuestion, QuizQuestionType } from '../types';
import type { MuscleChartsData, MuscleChart } from './dataLoader';

// Language templates for non-deterministic phrasing
const LANGUAGE_TEMPLATES = {
  // Association phrases (instead of "is" or "indicates")
  associated: [
    'is commonly associated with',
    'may be observed with',
    'has been linked to',
    'could potentially be related to',
    'is often observed in conjunction with'
  ],
  
  // Action phrases (instead of "should be" or "must be")
  couldConsider: [
    'could be considered',
    'may be appropriate',
    'is often discussed in relation to',
    'has been commonly used with',
    'might be a potential approach for'
  ],
  
  // Suggestion phrases (instead of "indicates" or "shows")
  maySuggest: [
    'may suggest',
    'could suggest',
    'might indicate',
    'has been observed to correlate with',
    'is often seen with'
  ],
  
};

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// Muscle Chart Question Generator
// ============================================

function createOriginInsertionQuestion(
  muscle: MuscleChart,
  allMuscles: MuscleChart[]
): QuizQuestion {
  const askOrigin = Math.random() > 0.5;
  const targetData = askOrigin ? muscle.origin : muscle.insertion;
  const targetType = askOrigin ? 'origin' : 'insertion';
  
  // Get distractors from other muscles (prefer different sections)
  const otherMuscles = allMuscles.filter(m => m.muscle !== muscle.muscle);
  const sameSectionMuscles = otherMuscles.filter(m => m.section === muscle.section);
  const differentSectionMuscles = otherMuscles.filter(m => m.section !== muscle.section);
  
  // Mix distractors: 1-2 from same section, 1-2 from different sections
  const distractorCount = 3;
  const distractorPool = [
    ...shuffleArray(sameSectionMuscles).slice(0, Math.min(2, sameSectionMuscles.length)),
    ...shuffleArray(differentSectionMuscles).slice(0, distractorCount)
  ];
  
  const distractors = shuffleArray(distractorPool)
    .slice(0, distractorCount)
    .map(m => askOrigin ? m.origin : m.insertion);
  
  const options = shuffleArray([targetData, ...distractors]);
  const correctIndex = options.indexOf(targetData);
  
  return {
    id: `muscle_${muscle.muscle.replace(/\s+/g, '_')}_${targetType}_${Date.now()}`,
    type: 'origin_insertion',
    question: `What is the ${targetType} of the ${muscle.muscle}?`,
    options,
    correct: correctIndex,
    explanation: `The ${muscle.muscle} has its ${targetType} at: ${targetData}.`
  };
}

function createMuscleIdentificationQuestion(
  muscle: MuscleChart,
  allMuscles: MuscleChart[]
): QuizQuestion {
  const useOrigin = Math.random() > 0.5;
  const clueData = useOrigin ? muscle.origin : muscle.insertion;
  const clueType = useOrigin ? 'origin' : 'insertion';
  
  // Get distractors from other muscles (prefer different sections)
  const otherMuscles = allMuscles.filter(m => m.muscle !== muscle.muscle);
  const differentSectionMuscles = otherMuscles.filter(m => m.section !== muscle.section);
  const sameSectionMuscles = otherMuscles.filter(m => m.section === muscle.section);
  
  // Mix distractors: prefer different sections
  const distractorPool = [
    ...shuffleArray(differentSectionMuscles).slice(0, 2),
    ...shuffleArray(sameSectionMuscles).slice(0, 1)
  ];
  
  const distractors = shuffleArray(distractorPool)
    .slice(0, 3)
    .map(m => m.muscle);
  
  const options = shuffleArray([muscle.muscle, ...distractors]);
  const correctIndex = options.indexOf(muscle.muscle);
  
  return {
    id: `muscle_identify_${muscle.muscle.replace(/\s+/g, '_')}_${Date.now()}`,
    type: 'muscle_identification',
    question: `Which muscle has its ${clueType} at: ${clueData}?`,
    options,
    correct: correctIndex,
    explanation: `The ${muscle.muscle} has its ${clueType} at: ${clueData}.`
  };
}

function createRegionSelectionQuestion(
  section: string,
  sectionMuscles: MuscleChart[],
  allMuscles: MuscleChart[]
): QuizQuestion {
  // Select 2-3 correct muscles from the section
  const correctCount = Math.min(3, Math.max(2, Math.floor(sectionMuscles.length * 0.5)));
  const correctMuscles = shuffleArray(sectionMuscles).slice(0, correctCount);
  const correctMuscleNames = correctMuscles.map(m => m.muscle);
  
  // Get distractors from other sections
  const otherMuscles = allMuscles.filter(m => m.section !== section);
  const distractors = shuffleArray(otherMuscles)
    .slice(0, 4 - correctCount)
    .map(m => m.muscle);
  
  const allOptions = shuffleArray([...correctMuscleNames, ...distractors]);
  const correctIndices = correctMuscleNames.map(name => allOptions.indexOf(name));
  
  return {
    id: `region_${section.replace(/\s+/g, '_')}_${Date.now()}`,
    type: 'region_selection',
    question: `Which of the following muscles belong to the ${section} region? (Select all that apply)`,
    options: allOptions,
    correct: correctIndices,
    explanation: `The muscles of the ${section} region include: ${correctMuscleNames.join(', ')}.`
  };
}

export function generateMuscleQuizQuestions(
  muscleCharts: MuscleChartsData,
  questionTypes: QuizQuestionType[],
  questionCount: number
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const allMuscles = muscleCharts.all_muscles || [];
  
  if (allMuscles.length === 0) {
    return questions;
  }
  
  // Calculate distribution of question types
  const typeCount = questionTypes.length;
  const questionsPerType = Math.floor(questionCount / typeCount);
  const remainder = questionCount % typeCount;
  
  const typeDistribution: Record<QuizQuestionType, number> = {} as Record<QuizQuestionType, number>;
  questionTypes.forEach((type, index) => {
    typeDistribution[type] = questionsPerType + (index < remainder ? 1 : 0);
  });
  
  // Shuffle muscles to ensure variety
  const shuffledMuscles = shuffleArray(allMuscles);
  let muscleIndex = 0;
  
  // Generate origin_insertion questions
  if (typeDistribution.origin_insertion && typeDistribution.origin_insertion > 0) {
    for (let i = 0; i < typeDistribution.origin_insertion && muscleIndex < shuffledMuscles.length; i++) {
      const muscle = shuffledMuscles[muscleIndex++];
      questions.push(createOriginInsertionQuestion(muscle, allMuscles));
    }
  }
  
  // Generate muscle_identification questions
  if (typeDistribution.muscle_identification && typeDistribution.muscle_identification > 0) {
    for (let i = 0; i < typeDistribution.muscle_identification && muscleIndex < shuffledMuscles.length; i++) {
      const muscle = shuffledMuscles[muscleIndex++];
      questions.push(createMuscleIdentificationQuestion(muscle, allMuscles));
    }
  }
  
  // Generate region_selection questions
  if (typeDistribution.region_selection && typeDistribution.region_selection > 0) {
    const sections = Object.keys(muscleCharts.muscles_by_section || {});
    const shuffledSections = shuffleArray(sections);
    let sectionIndex = 0;
    
    for (let i = 0; i < typeDistribution.region_selection && sectionIndex < shuffledSections.length; i++) {
      const section = shuffledSections[sectionIndex++];
      const sectionMuscles = muscleCharts.muscles_by_section[section] || [];
      
      if (sectionMuscles.length >= 2) {
        questions.push(createRegionSelectionQuestion(section, sectionMuscles, allMuscles));
      }
    }
  }
  
  return shuffleArray(questions).slice(0, questionCount);
}

// ============================================
// Pattern Question Generator
// ============================================

function createPatternIdentifyQuestion(
  pattern: Pattern,
  allPatterns: Pattern[]
): QuizQuestion {
  // Use description or biomechanical mechanism as clue
  const useDescription = Math.random() > 0.5;
  const clue = useDescription 
    ? (pattern.description || pattern.overview || pattern.name)
    : pattern.biomechanical_mechanism;
  
  const clueText = clue || pattern.name;
  
  // Get distractors from other patterns
  const otherPatterns = allPatterns.filter(p => p.id !== pattern.id);
  const distractors = shuffleArray(otherPatterns)
    .slice(0, 3)
    .map(p => p.name);
  
  const options = shuffleArray([pattern.name, ...distractors]);
  const correctIndex = options.indexOf(pattern.name);
  
  return {
    id: `pattern_identify_${pattern.id}_${Date.now()}`,
    type: 'identify',
    question: `Which movement pattern ${getRandomItem(LANGUAGE_TEMPLATES.maySuggest)} the following: ${clueText}?`,
    options,
    correct: correctIndex,
    explanation: `The ${pattern.name} pattern ${getRandomItem(LANGUAGE_TEMPLATES.associated)} this description.`
  };
}

function createCompensationQuestion(
  pattern: Pattern,
  allPatterns: Pattern[]
): QuizQuestion {
  if (!pattern.common_compensations || pattern.common_compensations.length === 0) {
    return createPatternIdentifyQuestion(pattern, allPatterns);
  }
  
  const correctCompensation = getRandomItem(pattern.common_compensations);
  
  // Get distractors from other patterns' compensations
  const allCompensations: string[] = [];
  allPatterns.forEach(p => {
    if (p.id !== pattern.id && p.common_compensations) {
      allCompensations.push(...p.common_compensations);
    }
  });
  
  const distractors = shuffleArray(allCompensations.filter(c => c !== correctCompensation))
    .slice(0, 3);
  
  const options = shuffleArray([correctCompensation, ...distractors]);
  const correctIndex = options.indexOf(correctCompensation);
  
  return {
    id: `compensation_${pattern.id}_${Date.now()}`,
    type: 'compensation',
    question: `Which compensation ${getRandomItem(LANGUAGE_TEMPLATES.associated)} the ${pattern.name} pattern?`,
    options,
    correct: correctIndex,
    explanation: `Common compensations associated with ${pattern.name} include: ${pattern.common_compensations.join(', ')}.`
  };
}

function createCorrectiveQuestion(
  pattern: Pattern,
  exercises: ExercisesByCategory
): QuizQuestion {
  // Get exercise names from exercise_ids
  const exerciseNames: string[] = [];
  pattern.exercise_ids?.forEach(id => {
    Object.values(exercises).forEach(category => {
      const exercise = category.find(e => e.id === id);
      if (exercise) {
        exerciseNames.push(exercise.name);
      }
    });
  });
  
  // Fallback to correctives if available
  if (exerciseNames.length === 0 && pattern.correctives && pattern.correctives.length > 0) {
    exerciseNames.push(...pattern.correctives);
  }
  
  if (exerciseNames.length === 0) {
    // Can't create this type of question, return null to be filtered
    return null as any;
  }
  
  const correctExercise = getRandomItem(exerciseNames);
  
  // Get distractors from other exercises
  const allExerciseNames: string[] = [];
  Object.values(exercises).forEach(category => {
    category.forEach(ex => {
      if (!pattern.exercise_ids?.includes(ex.id) && ex.name !== correctExercise) {
        allExerciseNames.push(ex.name);
      }
    });
  });
  
  const distractors = shuffleArray(allExerciseNames).slice(0, 3);
  const options = shuffleArray([correctExercise, ...distractors]);
  const correctIndex = options.indexOf(correctExercise);
  
  return {
    id: `corrective_${pattern.id}_${Date.now()}`,
    type: 'corrective',
    question: `When observing ${pattern.name}, which exercise ${getRandomItem(LANGUAGE_TEMPLATES.couldConsider)}?`,
    options,
    correct: correctIndex,
    explanation: `Exercises such as ${exerciseNames.join(', ')} ${getRandomItem(LANGUAGE_TEMPLATES.associated)} addressing the ${pattern.name} pattern.`
  };
}

function createBiomechanicalMechanismQuestion(
  pattern: Pattern,
  allPatterns: Pattern[]
): QuizQuestion {
  // Extract key mechanism info
  const mechanismText = pattern.biomechanical_mechanism || pattern.name;
  
  // Create question about mechanism or function
  const questionVariations = [
    `What biomechanical mechanism ${getRandomItem(LANGUAGE_TEMPLATES.maySuggest)} the ${pattern.name} pattern?`,
    `The ${pattern.name} pattern involves which biomechanical mechanism?`,
    `Which mechanism ${getRandomItem(LANGUAGE_TEMPLATES.associated)} ${pattern.name}?`
  ];
  
  // Get distractors from other patterns' mechanisms
  const otherMechanisms = allPatterns
    .filter(p => p.id !== pattern.id && p.biomechanical_mechanism)
    .map(p => p.biomechanical_mechanism || p.name);
  
  const distractors = shuffleArray(otherMechanisms).slice(0, 3);
  const options = shuffleArray([mechanismText, ...distractors]);
  const correctIndex = options.indexOf(mechanismText);
  
  return {
    id: `biomech_${pattern.id}_${Date.now()}`,
    type: 'biomechanical_mechanism',
    question: getRandomItem(questionVariations),
    options,
    correct: correctIndex,
    explanation: `The ${pattern.name} pattern involves: ${mechanismText}.`
  };
}

function createProgressionQuestion(
  pattern: Pattern,
  allPatterns: Pattern[]
): QuizQuestion {
  if (!pattern.progression || pattern.progression.length < 3) {
    return createPatternIdentifyQuestion(pattern, allPatterns);
  }
  
  // Ask about the correct progression sequence
  const correctProgression = pattern.progression.join(' → ');
  
  // Create incorrect progressions by shuffling or using other patterns
  const incorrectProgression1 = shuffleArray([...pattern.progression]).join(' → ');
  
  const otherPattern = allPatterns.find(p => p.id !== pattern.id && p.progression && p.progression.length >= 3);
  const incorrectProgression2 = otherPattern 
    ? otherPattern.progression!.join(' → ')
    : incorrectProgression1;
  
  const incorrectProgression3 = pattern.regression && pattern.regression.length >= 3
    ? pattern.regression.join(' → ')
    : incorrectProgression2;
  
  const options = shuffleArray([correctProgression, incorrectProgression1, incorrectProgression2, incorrectProgression3]);
  const correctIndex = options.indexOf(correctProgression);
  
  return {
    id: `progression_${pattern.id}_${Date.now()}`,
    type: 'progression',
    question: `What progression sequence ${getRandomItem(LANGUAGE_TEMPLATES.associated)} the ${pattern.name} pattern?`,
    options,
    correct: correctIndex,
    explanation: `The progression for ${pattern.name} typically follows: ${correctProgression}.`
  };
}

function createTrueFalseQuestion(
  pattern: Pattern,
  allPatterns: Pattern[]
): QuizQuestion {
  const otherPatterns = allPatterns.filter(p => p.id !== pattern.id);
  const isTrue = Math.random() > 0.5;

  let statement: string;
  let explanation: string;

  if (isTrue) {
    const templates: (() => string)[] = [];
    if (pattern.common_compensations?.length) {
      templates.push(
        () => `The ${pattern.name} pattern ${getRandomItem(LANGUAGE_TEMPLATES.associated)} ${getRandomItem(pattern.common_compensations)}.`
      );
    }
    const mechanism = pattern.biomechanical_mechanism || '';
    if (mechanism.length > 20) {
      const firstPart = mechanism.split(/[.!?]/)[0]?.trim().replace(/\.$/, '') || mechanism.slice(0, 100);
      templates.push(() => `${firstPart}.`);
    }
    if (pattern.overview?.length) {
      const firstSentence = pattern.overview.split(/[.!?]/)[0]?.trim().replace(/\.$/, '') || pattern.overview.slice(0, 100);
      templates.push(() => `${firstSentence}.`);
    }
    if (templates.length === 0) {
      statement = `The ${pattern.name} pattern is a recognized movement pattern in corrective exercise.`;
    } else {
      statement = getRandomItem(templates)();
    }
    explanation = `Correct. This accurately describes the ${pattern.name} pattern.`;
  } else {
    const other = otherPatterns.length ? getRandomItem(otherPatterns) : null;
    if (other?.common_compensations?.length) {
      const wrongComp = getRandomItem(other.common_compensations);
      statement = `The ${pattern.name} pattern ${getRandomItem(LANGUAGE_TEMPLATES.associated)} ${wrongComp}.`;
      explanation = `Incorrect. ${wrongComp} ${getRandomItem(LANGUAGE_TEMPLATES.associated)} the ${other.name} pattern, not ${pattern.name}.`;
    } else if (other?.biomechanical_mechanism) {
      const wrongMech = other.biomechanical_mechanism.split(/[.!?]/)[0]?.trim().slice(0, 80) || other.name;
      statement = `The ${pattern.name} pattern primarily involves: ${wrongMech}.`;
      explanation = `Incorrect. That mechanism ${getRandomItem(LANGUAGE_TEMPLATES.associated)} the ${other.name} pattern. The ${pattern.name} pattern involves different mechanisms.`;
    } else {
      statement = `The ${pattern.name} pattern is primarily a cervical pattern.`;
      explanation = `Incorrect. ${pattern.name} is not primarily a cervical pattern.`;
    }
  }

  const options = shuffleArray(['True', 'False']);
  const correct = options.indexOf(isTrue ? 'True' : 'False');

  return {
    id: `truefalse_${pattern.id}_${Date.now()}`,
    type: 'trueFalse',
    question: statement,
    options,
    correct,
    explanation
  };
}

export function generatePatternQuizQuestions(
  patterns: Pattern[],
  exercises: ExercisesByCategory,
  questionTypes: QuizQuestionType[],
  questionCount: number
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  if (patterns.length === 0) {
    return questions;
  }
  
  // Calculate distribution of question types
  const typeCount = questionTypes.length;
  const questionsPerType = Math.floor(questionCount / typeCount);
  const remainder = questionCount % typeCount;
  
  const typeDistribution: Record<QuizQuestionType, number> = {} as Record<QuizQuestionType, number>;
  questionTypes.forEach((type, index) => {
    typeDistribution[type] = questionsPerType + (index < remainder ? 1 : 0);
  });
  
  const shuffledPatterns = shuffleArray(patterns);
  let patternIndex = 0;
  
  // Generate questions by type
  questionTypes.forEach(type => {
    const count = typeDistribution[type] || 0;
    for (let i = 0; i < count && patternIndex < shuffledPatterns.length; i++) {
      const pattern = shuffledPatterns[patternIndex++];
      let question: QuizQuestion | null = null;
      
      switch (type) {
        case 'identify':
          question = createPatternIdentifyQuestion(pattern, patterns);
          break;
        case 'compensation':
          question = createCompensationQuestion(pattern, patterns);
          break;
        case 'corrective':
          question = createCorrectiveQuestion(pattern, exercises);
          break;
        case 'biomechanical_mechanism':
          question = createBiomechanicalMechanismQuestion(pattern, patterns);
          break;
        case 'progression':
          question = createProgressionQuestion(pattern, patterns);
          break;
        case 'trueFalse':
          question = createTrueFalseQuestion(pattern, patterns);
          break;
      }
      
      if (question) {
        questions.push(question);
      }
    }
  });
  
  return shuffleArray(questions).slice(0, questionCount);
}

// ============================================
// Assessment Question Generator
// ============================================

function createAssessmentIdentifyQuestion(
  assessment: Assessment,
  allAssessments: Assessment[]
): QuizQuestion {
  const clueText = assessment.description || assessment.purpose || assessment.name;
  
  const otherAssessments = allAssessments.filter(a => a.id !== assessment.id);
  const distractors = shuffleArray(otherAssessments)
    .slice(0, 3)
    .map(a => a.name);
  
  const options = shuffleArray([assessment.name, ...distractors]);
  const correctIndex = options.indexOf(assessment.name);
  
  return {
    id: `assessment_identify_${assessment.id}_${Date.now()}`,
    type: 'identify',
    question: `Which assessment ${getRandomItem(LANGUAGE_TEMPLATES.maySuggest)}: ${clueText}?`,
    options,
    correct: correctIndex,
    explanation: `The ${assessment.name} assessment is commonly used to: ${assessment.purpose || clueText}.`
  };
}

function createViewsQuestion(
  assessment: Assessment,
  allAssessments: Assessment[]
): QuizQuestion {
  if (!assessment.views || assessment.views.length === 0) {
    return createAssessmentIdentifyQuestion(assessment, allAssessments);
  }
  
  // Create a question about which view to use for a specific observation
  const observation = assessment.key_observations && assessment.key_observations.length > 0
    ? getRandomItem(assessment.key_observations)
    : 'observing movement quality';
  
  const correctView = getRandomItem(assessment.views);
  
  // Get distractors from standard views
  const allViews = ['frontal', 'sagittal', 'lateral', 'anterior', 'posterior', 'superior', 'inferior'];
  const distractors = shuffleArray(allViews.filter(v => !assessment.views.includes(v))).slice(0, 3);
  
  const options = shuffleArray([correctView, ...distractors]);
  const correctIndex = options.indexOf(correctView);
  
  return {
    id: `views_${assessment.id}_${Date.now()}`,
    type: 'views',
    question: `For the ${assessment.name} assessment, which view ${getRandomItem(LANGUAGE_TEMPLATES.maySuggest)} best for ${observation}?`,
    options,
    correct: correctIndex,
    explanation: `The ${assessment.name} assessment commonly uses the following views: ${assessment.views.join(', ')}.`
  };
}

function createProtocolQuestion(
  assessment: Assessment,
  allAssessments: Assessment[]
): QuizQuestion {
  if (!assessment.protocol || assessment.protocol.length === 0) {
    return createAssessmentIdentifyQuestion(assessment, allAssessments);
  }
  
  // Ask about a step in the protocol
  const correctStep = getRandomItem(assessment.protocol);
  const stepIndex = assessment.protocol.indexOf(correctStep);
  
  // Get distractors from other assessments' protocols or generic steps
  const allProtocolSteps: string[] = [];
  allAssessments.forEach(a => {
    if (a.id !== assessment.id && a.protocol) {
      allProtocolSteps.push(...a.protocol);
    }
  });
  
  const distractors = shuffleArray(allProtocolSteps.filter(s => s !== correctStep)).slice(0, 3);
  
  const options = shuffleArray([correctStep, ...distractors]);
  const correctIndex = options.indexOf(correctStep);
  
  return {
    id: `protocol_${assessment.id}_${Date.now()}`,
    type: 'protocol',
    question: `In the ${assessment.name} assessment, what ${getRandomItem(['step', 'action', 'procedure'])} ${getRandomItem(LANGUAGE_TEMPLATES.associated)} step ${stepIndex + 1}?`,
    options,
    correct: correctIndex,
    explanation: `The ${assessment.name} assessment protocol includes: ${assessment.protocol.join(' → ')}.`
  };
}

export function generateAssessmentQuizQuestions(
  assessments: Assessment[],
  questionTypes: QuizQuestionType[],
  questionCount: number
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  if (assessments.length === 0) {
    return questions;
  }
  
  // Calculate distribution
  const typeCount = questionTypes.length;
  const questionsPerType = Math.floor(questionCount / typeCount);
  const remainder = questionCount % typeCount;
  
  const typeDistribution: Record<QuizQuestionType, number> = {} as Record<QuizQuestionType, number>;
  questionTypes.forEach((type, index) => {
    typeDistribution[type] = questionsPerType + (index < remainder ? 1 : 0);
  });
  
  const shuffledAssessments = shuffleArray(assessments);
  let assessmentIndex = 0;
  
  questionTypes.forEach(type => {
    const count = typeDistribution[type] || 0;
    for (let i = 0; i < count && assessmentIndex < shuffledAssessments.length; i++) {
      const assessment = shuffledAssessments[assessmentIndex++];
      let question: QuizQuestion | null = null;
      
      switch (type) {
        case 'identify':
          question = createAssessmentIdentifyQuestion(assessment, assessments);
          break;
        case 'views':
          question = createViewsQuestion(assessment, assessments);
          break;
        case 'protocol':
          question = createProtocolQuestion(assessment, assessments);
          break;
      }
      
      if (question) {
        questions.push(question);
      }
    }
  });
  
  return shuffleArray(questions).slice(0, questionCount);
}

// ============================================
// Main Generator Function
// ============================================

export async function generateQuizQuestions(
  topicId: string,
  knowledgeBase: string,
  questionTypes: QuizQuestionType[],
  questionCount: number,
  patterns?: Pattern[],
  assessments?: Assessment[],
  exercises?: ExercisesByCategory,
  muscleCharts?: MuscleChartsData
): Promise<QuizQuestion[]> {
  // Route to appropriate generator based on knowledgeBase
  if (knowledgeBase === 'muscleCharts.json' && muscleCharts) {
    return generateMuscleQuizQuestions(muscleCharts, questionTypes, questionCount);
  }
  
  if (knowledgeBase === 'patterns.json' && patterns && exercises) {
    return generatePatternQuizQuestions(patterns, exercises, questionTypes, questionCount);
  }
  
  if (knowledgeBase === 'assessments.json' && assessments) {
    return generateAssessmentQuizQuestions(assessments, questionTypes, questionCount);
  }
  
  console.warn(`Unable to generate questions for topic ${topicId} with knowledgeBase ${knowledgeBase}`);
  return [];
}
