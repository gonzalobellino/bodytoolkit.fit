// Utility functions for evaluation mode
import type { Pattern, Assessment, ExercisesByCategory } from '../types';

// Language templates for non-deterministic phrasing (consistent with quizQuestionGenerator)
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

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getExerciseName(id: string | undefined, exercises: ExercisesByCategory): string {
  if (!id) return id ?? '';
  const allExercises = Object.values(exercises).flatMap((group) => group);
  const found = allExercises.find(e => e.id === id);
  return found?.name ?? id.replace(/_/g, ' ');
}

export interface EvaluationQuestion {
  type: 'identify' | 'corrective' | 'trueFalse' | 'fillBlank' | 'clinicalScenario' | 'matching' | 'sequence' | 'multiselect';
  pattern?: Pattern;
  question: string;
  statement?: string;
  scenario?: string;
  hint?: string;
  correctAnswer: string | boolean | string[];
  options: string[];
  explanation: string;
  pairs?: Record<string, string>;
  correctPairs?: Record<string, string>;
  items?: string[];
  correctOrder?: string[];
  correctAnswers?: string[];
}

export interface EvaluationConfig {
  zone: 'all' | 'upper' | 'lower' | 'core';
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timer: number;
}

export function getQuestionTypes(difficulty: 'easy' | 'medium' | 'hard'): string[] {
  // Note: 'matching' and 'sequence' are excluded as they're not yet fully implemented
  switch (difficulty) {
    case 'easy':
      return ['identify', 'trueFalse', 'corrective'];
    case 'medium':
      return ['identify', 'corrective', 'trueFalse', 'fillBlank'];
    case 'hard':
      return ['identify', 'corrective', 'trueFalse', 'fillBlank', 'clinicalScenario', 'multiselect'];
    default:
      return ['identify', 'trueFalse', 'corrective'];
  }
}

function generatePatternOptions(correctPattern: Pattern, allPatterns: Pattern[]): string[] {
  if (!correctPattern || !correctPattern.name) {
    console.warn('Invalid pattern provided to generatePatternOptions');
    return ['Pattern A', 'Pattern B', 'Pattern C', 'Pattern D'];
  }

  const options = [correctPattern.name];
  const filtered = allPatterns.filter(p => p && p.name && p.name !== correctPattern.name);

  // Ensure we have at least 4 options
  const neededOptions = Math.max(3, 4 - options.length);
  
  // Try to get options from actual patterns
  const availablePatterns = [...filtered];
  for (let i = 0; i < neededOptions && availablePatterns.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availablePatterns.length);
    const option = availablePatterns[randomIndex].name;
    if (option && !options.includes(option)) {
      options.push(option);
    }
    availablePatterns.splice(randomIndex, 1);
  }

  // Fallback: if we still don't have enough options, add generic patterns
  const genericPatterns = ['Overhead Squat', 'Single-Leg Squat', 'Hip Hinge', 'Lunge', 'Push-up', 'Pull-up', 'Squat', 'Deadlift', 'Row', 'Press'];
  while (options.length < 4) {
    const generic = genericPatterns[Math.floor(Math.random() * genericPatterns.length)];
    if (generic && !options.includes(generic)) {
      options.push(generic);
    }
    // Prevent infinite loop
    if (options.length >= genericPatterns.length) break;
  }

  // Final safety check - ensure we have at least 4 options
  if (options.length < 4) {
    const fallbackOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
    fallbackOptions.forEach((opt, idx) => {
      if (options.length < 4 && !options.includes(opt)) {
        options.push(opt);
      }
    });
  }

  return shuffleArray(options).slice(0, 4); // Ensure exactly 4 options
}

function generateCorrectiveOptions(
  correctPattern: Pattern,
  allPatterns: Pattern[],
  exercises: ExercisesByCategory
): string[] {
  const primaryId = correctPattern.exercise_ids?.[0];
  const primaryName = getExerciseName(primaryId, exercises);
  const options: string[] = [];
  
  // Collect all exercises from other patterns first
  const otherExercises: string[] = [];
  allPatterns.forEach(p => {
    if (p.name !== correctPattern.name && p.exercise_ids && p.exercise_ids.length > 0) {
      p.exercise_ids.forEach(id => {
        const exerciseName = getExerciseName(id, exercises);
        if (exerciseName && exerciseName !== primaryName && !otherExercises.includes(exerciseName)) {
          otherExercises.push(exerciseName);
        }
      });
    }
  });

  // Add exercises from all available exercises
  Object.values(exercises).forEach(category => {
    category.forEach(ex => {
      const exerciseName = ex.name;
      if (exerciseName && exerciseName !== primaryName && !otherExercises.includes(exerciseName)) {
        otherExercises.push(exerciseName);
      }
    });
  });

  // Select 3 distractors randomly (we'll add the correct answer later in createCorrectiveQuestion)
  const shuffledOthers = shuffleArray(otherExercises);
  const neededDistractors = 3;
  
  for (let i = 0; i < neededDistractors && i < shuffledOthers.length; i++) {
    if (!options.includes(shuffledOthers[i])) {
      options.push(shuffledOthers[i]);
    }
  }

  // Fallback: generic exercise names if we still don't have enough
  const genericExercises = ['Foam Rolling', 'Core Activation', 'Diaphragmatic Breathing', 'Hip Mobility', 'Shoulder Mobility', 'Ankle Mobility'];
  while (options.length < 3) {
    const generic = genericExercises[Math.floor(Math.random() * genericExercises.length)];
    if (!options.includes(generic)) {
      options.push(generic);
    }
  }

  // Ensure we have exactly 3 distractors (correct answer will be added in createCorrectiveQuestion)
  return options.slice(0, 3);
}

function createIdentifyQuestion(pattern: Pattern, allPatterns: Pattern[]): EvaluationQuestion {
  const description = pattern.overview ?? pattern.biomechanical_mechanism ?? pattern.name;
  const clueText = description || pattern.name;
  return {
    type: 'identify',
    pattern,
    question: `Which movement pattern ${getRandomItem(LANGUAGE_TEMPLATES.maySuggest)} the following description?\n\n"${clueText}"`,
    correctAnswer: pattern.name,
    options: generatePatternOptions(pattern, allPatterns),
    explanation: `The ${pattern.name} pattern ${getRandomItem(LANGUAGE_TEMPLATES.associated)} this description.`
  };
}

function createCorrectiveQuestion(pattern: Pattern, allPatterns: Pattern[], exercises: ExercisesByCategory): EvaluationQuestion | null {
  // Get exercise names from exercise_ids
  const exerciseNames: string[] = [];
  pattern.exercise_ids?.forEach(id => {
    const name = getExerciseName(id, exercises);
    if (name) {
      exerciseNames.push(name);
    }
  });
  
  // Fallback to correctives if available
  if (exerciseNames.length === 0 && pattern.correctives && pattern.correctives.length > 0) {
    exerciseNames.push(...pattern.correctives);
  }
  
  if (exerciseNames.length === 0) {
    return null; // Can't create this type of question
  }
  
  const correctExercise = exerciseNames[0];
  const distractors = generateCorrectiveOptions(pattern, allPatterns, exercises);
  
  // Build options array with correct answer + 3 distractors
  const options = [correctExercise, ...distractors.filter(d => d !== correctExercise)];
  
  // Ensure we have exactly 4 options
  if (options.length < 4) {
    const genericExercises = ['Foam Rolling', 'Core Activation', 'Diaphragmatic Breathing', 'Hip Mobility', 'Shoulder Mobility', 'Ankle Mobility'];
    while (options.length < 4) {
      const generic = genericExercises[Math.floor(Math.random() * genericExercises.length)];
      if (!options.includes(generic)) {
        options.push(generic);
      }
    }
  }
  
  return {
    type: 'corrective',
    pattern,
    question: `When observing ${pattern.name}, which exercise ${getRandomItem(LANGUAGE_TEMPLATES.couldConsider)}?`,
    correctAnswer: correctExercise,
    options: shuffleArray(options),
    explanation: `Exercises such as ${exerciseNames.join(', ')} ${getRandomItem(LANGUAGE_TEMPLATES.associated)} addressing the ${pattern.name} pattern.`
  };
}

function createTrueFalseQuestion(
  pattern: Pattern,
  allPatterns: Pattern[],
  exercises: ExercisesByCategory
): EvaluationQuestion {
  const isTrue = Math.random() > 0.5;
  let statement: string;
  let explanation: string;

  if (isTrue) {
    const opts = [
      pattern.common_compensations?.[0]
        ? {
            s: `"${pattern.name}" ${getRandomItem(['can be associated with', 'may be observed with', 'is commonly linked to'])} "${pattern.common_compensations[0]}"`,
            e: 'Correct. This is a common compensation that may be observed with this pattern.'
          }
        : null,
      pattern.exercise_ids?.[0]
        ? {
            s: `"${getExerciseName(pattern.exercise_ids[0], exercises)}" ${getRandomItem(['may be appropriate for', 'could be considered for', 'is often used with'])} "${pattern.name}"`,
            e: 'Correct. This exercise is commonly used in relation to this pattern.'
          }
        : null
    ].filter(Boolean) as Array<{ s: string; e: string }>;

    const choice = opts[Math.floor(Math.random() * opts.length)] || {
      s: `"${pattern.name}" is a recognized dysfunctional movement pattern`,
      e: 'Correct. This pattern is commonly recognized in movement assessment contexts.'
    };
    statement = choice.s;
    explanation = choice.e;
  } else {
    // Generate false statements with absolute claims (intentionally incorrect)
    const other = allPatterns.find(p => p.name !== pattern.name && p.exercise_ids?.length > 0);
    const otherExercise = other?.exercise_ids?.[0] 
      ? getExerciseName(other.exercise_ids[0], exercises)
      : null;
    const patternExercise = pattern.exercise_ids?.[0]
      ? getExerciseName(pattern.exercise_ids[0], exercises)
      : null;
    
    const falseOptions = [
      otherExercise
        ? `"${otherExercise}" is the only exercise appropriate for "${pattern.name}"`
        : patternExercise
        ? `"${patternExercise}" is the primary exercise for "${pattern.name}"`
        : `"${pattern.name}" always requires immediate medical intervention`,
      `"${pattern.name}" never requires assessment before intervention`,
      `All clients with "${pattern.name}" must be referred to a specialist`,
      `"${pattern.name}" can only be addressed with one specific exercise approach`,
      patternExercise
        ? `"${patternExercise}" is always the best exercise choice for "${pattern.name}"`
        : `"${pattern.name}" always presents with the same symptoms`
    ].filter(Boolean) as string[];
    
    statement = falseOptions[Math.floor(Math.random() * falseOptions.length)];
    
    // More detailed explanation based on the statement type - always show why it's incorrect
    if (statement.includes('only exercise') || statement.includes('primary') || statement.includes('always the best')) {
      const correctExercise = patternExercise || otherExercise || 'various exercises';
      explanation = `False. This statement makes an absolute claim about exercise selection ("only", "primary", "always"). In educational contexts, exercise selection for "${pattern.name}" ${getRandomItem(['may involve', 'could include', 'often considers'])} multiple approaches, and exercises such as ${correctExercise} ${getRandomItem(['may be considered', 'could potentially be used', 'are often discussed'])}. Exercise selection should be based on individual assessment rather than absolute rules.`;
    } else if (statement.includes('always requires') || statement.includes('never requires') || statement.includes('must be referred')) {
      explanation = `False. This statement makes an absolute claim about intervention requirements ("always", "never", "must"). Clinical decisions and exercise selection ${getRandomItem(['should be based on', 'typically depend on', 'are evaluated according to'])} individual assessment and context, not absolute rules. What ${getRandomItem(['may be appropriate', 'could be considered', 'might be indicated'])} for one individual ${getRandomItem(['may differ', 'could vary', 'might change'])} for another.`;
    } else {
      explanation = `False. This statement makes an absolute claim that is not accurate. In educational contexts, movement patterns and interventions ${getRandomItem(['may vary', 'can differ', 'should be considered'])} based on individual circumstances, assessment findings, and specific contexts.`;
    }
  }

  return {
    type: 'trueFalse',
    pattern,
    question: 'True or False?',
    statement,
    correctAnswer: isTrue,
    options: ['True', 'False'],
    explanation
  };
}

function createFillBlankQuestion(pattern: Pattern, allPatterns: Pattern[], assessments: Assessment[]): EvaluationQuestion | null {
  const firstAssessmentId = pattern.assessment_ids?.[0];
  const firstAssessment = firstAssessmentId
    ? assessments.find(a => a.id === firstAssessmentId)
    : null;

  const templates = [
    firstAssessment
      ? {
          text: `Which assessment ${getRandomItem(LANGUAGE_TEMPLATES.maySuggest)} evaluating "${pattern.name}"?`,
          answer: firstAssessment.name,
          hint: 'Specific test or assessment commonly used'
        }
      : null,
    pattern.common_compensations?.[0]
      ? {
          text: `A common compensation that ${getRandomItem(['may be observed with', 'is often associated with', 'could potentially occur with'])} "${pattern.name}" is:`,
          answer: pattern.common_compensations[0],
          hint: 'Observable compensation pattern'
        }
      : null
  ].filter(Boolean) as Array<{ text: string; answer: string; hint: string }>;

  if (templates.length === 0) return null;

  const t = templates[Math.floor(Math.random() * templates.length)];
  const options = [t.answer];
  
  // Get distractors from other assessments or patterns
  const fillers: string[] = [];
  
  // Add other assessment names
  assessments.forEach(a => {
    if (a.name !== t.answer && !fillers.includes(a.name) && fillers.length < 6) {
      fillers.push(a.name);
    }
  });
  
  // Add other compensations
  allPatterns.forEach(p => {
    if (p.common_compensations && p.common_compensations.length > 0) {
      p.common_compensations.forEach(comp => {
        if (comp !== t.answer && !fillers.includes(comp) && fillers.length < 6) {
          fillers.push(comp);
        }
      });
    }
  });
  
  // Fallback generic options
  const genericOptions = ['Core activation', 'Diaphragmatic breathing', 'General foam rolling', 'Aerobic cardio', 'Static stretching', 'Dynamic warm-up'];
  genericOptions.forEach(opt => {
    if (opt !== t.answer && !fillers.includes(opt) && fillers.length < 6) {
      fillers.push(opt);
    }
  });
  
  while (options.length < 4 && fillers.length > 0) {
    const randomFiller = fillers[Math.floor(Math.random() * fillers.length)];
    if (!options.includes(randomFiller)) {
      options.push(randomFiller);
      fillers.splice(fillers.indexOf(randomFiller), 1);
    } else {
      fillers.splice(fillers.indexOf(randomFiller), 1);
    }
  }

  // Ensure we have at least 4 options
  while (options.length < 4) {
    const generic = genericOptions[Math.floor(Math.random() * genericOptions.length)];
    if (!options.includes(generic)) {
      options.push(generic);
    }
  }

  return {
    type: 'fillBlank',
    pattern,
    question: t.text,
    hint: t.hint,
    correctAnswer: t.answer,
    options: shuffleArray(options),
    explanation: `${t.answer} ${getRandomItem(LANGUAGE_TEMPLATES.associated)} this context.`
  };
}

function createClinicalScenarioQuestion(pattern: Pattern): EvaluationQuestion {
  const hasRedFlag = pattern.red_flags?.length > 0;
  const redFlag = pattern.red_flags?.[0] ?? '';

  const scenario = hasRedFlag
    ? `A 40-year-old client presents ${pattern.name}. Reports: "${redFlag}". What action ${getRandomItem(['may be', 'could be', 'might be'])} ${getRandomItem(['recommended', 'indicated', 'commonly considered'])}?`
    : `A 35-year-old client presents ${pattern.name} without additional symptoms. What action ${getRandomItem(['may be', 'could be', 'might be'])} ${getRandomItem(['recommended', 'indicated', 'commonly considered'])}?`;

  const correctAction = hasRedFlag ? 'Refer to a medical specialist' : 'Consider a supervised corrective program';

  return {
    type: 'clinicalScenario',
    pattern,
    question: '🏥 Clinical Scenario',
    scenario,
    correctAnswer: correctAction,
    options: [
      'Refer to a medical specialist',
      'Consider a supervised corrective program',
      'Observe and monitor for 4 weeks',
      'Increase exercise intensity immediately'
    ],
    explanation: hasRedFlag
      ? `Red flag present ("${redFlag}"). In such cases, referral to a medical specialist ${getRandomItem(['may be', 'could be', 'is often'])} recommended before implementing intervention strategies.`
      : 'Without red flags, a supervised corrective program could be considered as an appropriate approach.'
  };
}

function createMatchingQuestion(patterns: Pattern[]): EvaluationQuestion {
  const pairs: Record<string, string> = {};
  patterns.forEach(p => {
    if (p.common_compensations && p.common_compensations.length > 0) {
      pairs[p.name] = p.common_compensations[0];
    }
  });
  return {
    type: 'matching',
    question: 'Match each pattern to a compensation that may be observed with it',
    pairs,
    correctPairs: pairs,
    options: [],
    correctAnswer: '',
    explanation: 'Each pattern may be associated with specific compensations observed in movement assessment contexts.'
  };
}

function createMultiSelectQuestion(pattern: Pattern, allPatterns: Pattern[]): EvaluationQuestion | null {
  const correctFlags = pattern.red_flags ?? [];
  
  if (correctFlags.length === 0) {
    return null; // Can't create multiselect without red flags
  }

  const allRedFlags: Array<{ text: string; correct: boolean }> = [];
  
  // Add correct red flags
  correctFlags.forEach(rf => allRedFlags.push({ text: rf, correct: true }));

  // Get distractors from other patterns' red flags
  const otherRedFlags: string[] = [];
  allPatterns.forEach(p => {
    if (p.name !== pattern.name && p.red_flags && p.red_flags.length > 0) {
      p.red_flags.forEach(rf => {
        if (!correctFlags.includes(rf) && !otherRedFlags.includes(rf) && otherRedFlags.length < 6) {
          otherRedFlags.push(rf);
        }
      });
    }
  });

  // Select random distractors from other patterns
  const shuffledOthers = shuffleArray(otherRedFlags);
  const neededDistractors = Math.max(2, 4 - correctFlags.length);
  shuffledOthers.slice(0, neededDistractors).forEach(ff => {
    allRedFlags.push({ text: ff, correct: false });
  });

  // Fallback fake flags if we need more
  const fakeFlags = [
    'Mild muscle soreness after exercise',
    'Light fatigue at the end of training',
    'Increased flexibility after stretching',
    'Mild discomfort when starting the movement',
    'Normal post-exercise stiffness',
    'Improved range of motion after warm-up'
  ];
  
  let fakeIndex = 0;
  while (allRedFlags.length < 6 && fakeIndex < fakeFlags.length) {
    const fake = fakeFlags[fakeIndex];
    if (!allRedFlags.find(f => f.text === fake)) {
      allRedFlags.push({ text: fake, correct: false });
    }
    fakeIndex++;
  }

  const shuffledOptions = shuffleArray(allRedFlags).map(f => f.text);

  return {
    type: 'multiselect',
    pattern,
    question: 'Select ALL red flags that may require referral to a medical specialist:',
    options: shuffledOptions,
    correctAnswers: correctFlags,
    correctAnswer: correctFlags,
    explanation: `Red flags that ${getRandomItem(['may require', 'could potentially require', 'often warrant'])} referral for "${pattern.name}" include: ${correctFlags.join(', ')}.`
  };
}

function createQuestionByType(
  type: string,
  pattern: Pattern,
  allPatterns: Pattern[],
  assessments: Assessment[],
  exercises: ExercisesByCategory
): EvaluationQuestion | null {
  switch (type) {
    case 'identify':
      return createIdentifyQuestion(pattern, allPatterns);
    case 'corrective': {
      const correctiveQ = createCorrectiveQuestion(pattern, allPatterns, exercises);
      return correctiveQ || createIdentifyQuestion(pattern, allPatterns);
    }
    case 'trueFalse':
      return createTrueFalseQuestion(pattern, allPatterns, exercises);
    case 'fillBlank': {
      const fillBlankQ = createFillBlankQuestion(pattern, allPatterns, assessments);
      return fillBlankQ || createIdentifyQuestion(pattern, allPatterns);
    }
    case 'clinicalScenario':
      return createClinicalScenarioQuestion(pattern);
    case 'matching': {
      // Matching questions are not yet fully implemented, use identify as fallback
      return createIdentifyQuestion(pattern, allPatterns);
    }
    case 'multiselect': {
      const multiselectQ = createMultiSelectQuestion(pattern, allPatterns);
      return multiselectQ || createIdentifyQuestion(pattern, allPatterns);
    }
    default:
      return createIdentifyQuestion(pattern, allPatterns);
  }
}

export function generateQuestionsWithConfig(
  config: EvaluationConfig,
  patterns: Pattern[],
  assessments: Assessment[],
  exercises: ExercisesByCategory
): EvaluationQuestion[] {
  const questions: EvaluationQuestion[] = [];
  let filteredPatterns = [...patterns];

  if (config.zone !== 'all') {
    filteredPatterns = filteredPatterns.filter(p => {
      const cat = (p.category || '').toLowerCase();
      return cat.includes(config.zone.toLowerCase());
    });
  }

  if (filteredPatterns.length < 4) filteredPatterns = [...patterns];

  if (filteredPatterns.length === 0) {
    console.warn('No patterns available for question generation');
    return [];
  }

  const shuffledPatterns = shuffleArray(filteredPatterns);
  const types = getQuestionTypes(config.difficulty);

  let typeIdx = 0;
  let attempts = 0;
  const maxAttempts = config.count * 3; // Allow more attempts to find valid questions

  while (questions.length < config.count && attempts < maxAttempts) {
    const pattern = shuffledPatterns[attempts % shuffledPatterns.length];
    const type = types[typeIdx % types.length];

    const q = createQuestionByType(type, pattern, shuffledPatterns, assessments, exercises);
    
    // Validate question has required fields
    // Skip matching questions as they're not yet fully implemented
    if (q && q.type !== 'matching') {
      // For all question types except matching, ensure options array has at least 2 items
      if (q.options && q.options.length >= 2 && q.correctAnswer !== null && q.correctAnswer !== undefined && q.correctAnswer !== '') {
        questions.push(q);
        typeIdx++;
      } else {
        // If question is invalid, try to create an identify question as fallback
        const fallbackQ = createIdentifyQuestion(pattern, shuffledPatterns);
        if (fallbackQ && fallbackQ.options && fallbackQ.options.length >= 2) {
          questions.push(fallbackQ);
          typeIdx++;
        }
      }
    } else if (q && q.type === 'matching') {
      // If matching question was generated (shouldn't happen now, but just in case), create fallback
      const fallbackQ = createIdentifyQuestion(pattern, shuffledPatterns);
      if (fallbackQ && fallbackQ.options && fallbackQ.options.length >= 2) {
        questions.push(fallbackQ);
        typeIdx++;
      }
    }
    
    attempts++;
  }

  // If we still don't have enough questions, fill with identify questions
  while (questions.length < config.count && shuffledPatterns.length > 0) {
    const pattern = shuffledPatterns[questions.length % shuffledPatterns.length];
    const fallbackQ = createIdentifyQuestion(pattern, shuffledPatterns);
    if (fallbackQ && fallbackQ.options && fallbackQ.options.length >= 2) {
      questions.push(fallbackQ);
    } else {
      break; // Can't generate more valid questions
    }
  }

  return shuffleArray(questions).slice(0, config.count);
}
