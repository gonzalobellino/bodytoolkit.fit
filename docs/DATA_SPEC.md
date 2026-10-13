# Data Specification - Corrective Exercise Toolkit

## Overview
All business data in the application is stored in JSON files located in `app/public/data/`. This specification defines the structure, relationships, and validation rules for all data types.

## Data File Locations

All data files are located in `app/public/data/`:
- `patterns.json` - Movement dysfunction patterns
- `assessments.json` - Assessment protocols and tests
- `exercises.json` - Exercise library (grouped by category)
- `conditions.json` - Pathological conditions
- `clinical-cases.json` - Clinical case studies
- `quizQuestions.json` - Quiz question bank (grouped by topic)
- `quizTopics.json` - Quiz metadata
- `glossary.json` - Glossary terms
- `client-questionnaire.json` - Client intake questionnaire
- `physical-activity-readiness.json` - PAR-Q questionnaire
- `lefs.json` - Lower Extremity Functional Scale
- `uefi.json` - Upper Extremity Functional Index

## ID Naming Convention

All IDs must follow the namespace prefix convention:
- **Patterns**: `p__*` (e.g., `p__knee_valgus`, `p__forward_head_posture`)
- **Assessments**: `a__*` (e.g., `a__overhead_squat_assessment`, `a__single_leg_squat_assessment`)
- **Exercises**: `e__*` (e.g., `e__chin_tuck`, `e__clamshell`)
- **Conditions**: `c__*` (e.g., `c__shoulder_impingement`, `c__patellofemoral_pain_syndrome`)

IDs must be:
- Globally unique across all collections
- Lowercase with underscores
- Descriptive and consistent

## Data Types

### 1. Pattern

**File**: `patterns.json`  
**Type**: `Pattern[]` (array of Pattern objects)  
**Purpose**: Movement dysfunction patterns and compensations

#### Schema
```typescript
interface Pattern {
  id: string;                    // Required: p__*
  name: string;                  // Required
  category: string;             // Required: e.g., "Dynamic Patterns - Lower Limb"
  description?: string;          // Optional: Short description
  overview?: string;            // Optional: Detailed overview
  biomechanical_mechanism: string;  // Required: Explanation of mechanism
  clinical_rationale: string;   // Required: Clinical significance
  evidence?: {                   // Optional: Evidence base
    description?: string;
    level?: string;              // e.g., "strong", "moderate"
    summary?: string;
    pubmed_links?: string[];
    sources?: Array<{
      title: string;
      url: string;
      type: string;             // e.g., "RCT", "literature review"
      doi?: string;
      doi_url?: string;
    }>;
  };
  common_compensations: string[];  // Required: Array of compensation descriptions
  correctives?: string[];        // Optional: Legacy field, prefer exercise_ids
  progression: string[];         // Required: Progression levels
  regression: string[];          // Required: Regression options
  red_flags: string[];           // Required: Red flag warnings
  assessment_ids: string[];      // Required: Array of a__* IDs
  exercise_ids: string[];        // Required: Array of e__* IDs
  condition_ids?: string[];      // Optional: Array of c__* IDs
  practical_solution?: string;   // Optional: Practical approach
  differential_diagnosis?: string[];  // Optional: Differential diagnoses
  related_patterns?: string[];   // Optional: Array of p__* IDs
  images?: string[];             // Optional: Image file paths
  videos?: string[];             // Optional: Video file paths
}
```

#### Validation Rules
- `id` must start with `p__`
- `assessment_ids` must reference existing assessment IDs
- `exercise_ids` must reference existing exercise IDs
- `condition_ids` (if present) must reference existing condition IDs
- `related_patterns` (if present) must reference existing pattern IDs
- No duplicate IDs in any `*_ids` array
- All referenced IDs must exist in their respective collections

#### Example
```json
{
  "id": "p__knee_valgus",
  "name": "Knee Valgus",
  "category": "Dynamic Patterns - Lower Limb",
  "overview": "Knee valgus (medial knee collapse) is one of the most prevalent...",
  "biomechanical_mechanism": "Dynamic valgus results from a combination of...",
  "clinical_rationale": "Knee valgus is a major risk factor for ACL injury...",
  "common_compensations": [
    "Compensatory tibial external rotation",
    "Increased hip flexion"
  ],
  "progression": [
    "Level 1: Activation in stable positions",
    "Level 2: Bilateral closed-chain strengthening"
  ],
  "regression": [
    "Reduce squat range of motion",
    "Use external feedback"
  ],
  "red_flags": [
    "True knee instability (giving way)",
    "Recurrent joint effusion"
  ],
  "assessment_ids": [
    "a__overhead_squat_assessment",
    "a__single_leg_squat_assessment"
  ],
  "exercise_ids": [
    "e__clamshell",
    "e__monster_walk"
  ],
  "related_patterns": [
    "p__anterior_pelvic_tilt",
    "p__overpronation"
  ]
}
```

### 2. Assessment

**File**: `assessments.json`  
**Type**: `Assessment[]` (array of Assessment objects)  
**Purpose**: Assessment protocols, tests, and movement screens

#### Schema
```typescript
interface Assessment {
  id: string;                    // Required: a__*
  name: string;                  // Required
  category: string;             // Required: e.g., "Movement Screen"
  description: string;          // Required: Description of assessment
  purpose: string;              // Required: Purpose of assessment
  execution: string[];          // Required: Step-by-step execution
  views: string[];              // Required: Observation views (e.g., ["frontal", "lateral"])
  key_observations: string[];   // Required: What to observe
  positive_indicators: Record<string, string>;  // Required: Indicators by view
  protocol: string[];          // Required: Protocol steps
  reference?: string;           // Optional: Reference source
}
```

#### Validation Rules
- `id` must start with `a__`
- `views` must be valid view names (typically: "frontal", "lateral", "posterior")
- `positive_indicators` keys should match `views` values
- All referenced IDs in patterns must exist

#### Example
```json
{
  "id": "a__overhead_squat_assessment",
  "name": "Overhead Squat Assessment",
  "category": "Movement Screen",
  "description": "Global assessment of mobility and stability during an overhead squat.",
  "purpose": "Screen for global mobility and stability during an overhead squat.",
  "views": ["frontal", "lateral", "posterior"],
  "key_observations": [
    "Depth (femur at least parallel)",
    "Knee alignment over feet",
    "Torso posture (ideally vertical)"
  ],
  "positive_indicators": {
    "frontal": "Medial knee collapse (valgus)",
    "lateral": "Excessive torso lean, increased lumbar arch",
    "posterior": "Pelvic rotation or asymmetry"
  },
  "protocol": [
    "Observe from: frontal, lateral, posterior.",
    "Standardize start position and instructions.",
    "Perform 2-3 trials per side when applicable."
  ],
  "execution": [
    "Stand with feet shoulder-width apart",
    "Raise arms overhead with elbows extended",
    "Perform 5-10 controlled squats"
  ],
  "reference": "ISSA CPT, Chapter 07 - Client Assessments"
}
```

### 3. Exercise

**File**: `exercises.json`  
**Type**: `ExercisesByCategory` (object with category keys)  
**Purpose**: Corrective exercises organized by body region/category

#### Schema
```typescript
interface Exercise {
  id: string;                    // Required: e__*
  name: string;                  // Required
  target: string;               // Required: Target muscle/area
  description: string;          // Required: Exercise description
  execution: string[];          // Required: Step-by-step execution
  cues: string[];               // Required: Coaching cues
  common_errors: string[];      // Required: Common mistakes
  progressions: string[];       // Required: Progression options
  reference?: string;           // Optional: Reference source
  category?: string;            // Optional: Category (also in parent key)
  images?: string[];            // Optional: Image file paths
  videos?: string[];            // Optional: Video file paths
  pattern_ids?: string[];       // Optional: Related pattern IDs (bidirectional)
}

interface ExercisesByCategory {
  [category: string]: Exercise[];  // e.g., "cervical_exercises", "shoulder_exercises"
}
```

#### Validation Rules
- `id` must start with `e__`
- `pattern_ids` (if present) must reference existing pattern IDs
- If `pattern_ids` exists, ensure corresponding patterns have this exercise in `exercise_ids`
- Category in object key should match `category` field (if present)

#### Example
```json
{
  "cervical_exercises": [
    {
      "id": "e__chin_tuck",
      "name": "Chin Tuck",
      "target": "Deep Neck Flexors (DNF)",
      "description": "Primary activation drill for the deep neck flexors.",
      "execution": [
        "Position: supine, then progress to seated and standing",
        "Glide the chin straight back (no head tilt)",
        "Hold 10 seconds, relax 5 seconds"
      ],
      "cues": [
        "Think \"head slides back\" not \"head tips down\"",
        "Keep the throat and jaw relaxed"
      ],
      "common_errors": [
        "Cervical flexion instead of retraction",
        "Excess upper trap tension"
      ],
      "progressions": [
        "Supine -> Seated -> Standing -> Light manual resistance"
      ],
      "pattern_ids": [
        "p__forward_head_posture",
        "p__upper_crossed_syndrome"
      ],
      "reference": "ExRx.net"
    }
  ]
}
```

### 4. Condition

**File**: `conditions.json`  
**Type**: `Condition[]` (array of Condition objects)  
**Purpose**: Pathological conditions and diagnoses

#### Schema
```typescript
interface Condition {
  id: string;                    // Required: c__*
  name: string;                 // Required
  category: string;            // Required: e.g., "Shoulder - Pathology"
  overview: string;            // Required: Condition overview
  biomechanical_mechanism: string;  // Required: Mechanism explanation
  clinical_rationale: string;   // Required: Clinical significance
  practical_solution: string;   // Required: Practical approach
  common_compensations: string[];  // Required: Common compensations
  correctives: string[];       // Required: Corrective strategies (text)
  progression: string[];       // Required: Progression levels
  regression: string[];        // Required: Regression options
  red_flags: string[];         // Required: Red flag warnings
  differential_diagnosis: string[];  // Required: Differential diagnoses
  assessment_ids: string[];    // Required: Array of a__* IDs
  exercise_ids: string[];      // Required: Array of e__* IDs
  images?: string[];           // Optional: Image file paths
  videos?: string[];           // Optional: Video file paths
}
```

#### Validation Rules
- `id` must start with `c__`
- `assessment_ids` must reference existing assessment IDs
- `exercise_ids` must reference existing exercise IDs
- All referenced IDs must exist

#### Example
```json
{
  "id": "c__shoulder_impingement",
  "name": "Shoulder Impingement",
  "category": "Shoulder - Pathology",
  "overview": "Shoulder impingement involves compression of subacromial structures...",
  "biomechanical_mechanism": "Decreased subacromial space from scapular dyskinesis...",
  "clinical_rationale": "Impingement is often secondary to scapular and thoracic dysfunction...",
  "practical_solution": "Address scapular control and posterior capsule stiffness...",
  "common_compensations": [
    "Painful arc during elevation",
    "Scapular hiking"
  ],
  "correctives": [
    "Scapular stabilization drills",
    "Posterior capsule mobility"
  ],
  "progression": [
    "Level 1: Pain-free mobility",
    "Level 2: Scapular activation"
  ],
  "regression": [
    "Avoid painful arcs",
    "Reduce load"
  ],
  "red_flags": [
    "Severe pain at rest",
    "Night pain"
  ],
  "differential_diagnosis": [
    "Rotator cuff tear",
    "Bursitis"
  ],
  "assessment_ids": [
    "a__shoulder_impingement_test"
  ],
  "exercise_ids": [
    "e__wall_elbow_walk_band",
    "e__y_raise_swiss_ball"
  ]
}
```

### 5. Clinical Case

**File**: `clinical-cases.json`  
**Type**: `{ version: string, lastUpdated: string, metadata: object, cases: ClinicalCase[] }`  
**Purpose**: Clinical case studies for practice and evaluation

#### Schema
```typescript
interface ClinicalCase {
  id: number;                   // Required: Numeric ID
  difficulty: 'easy' | 'intermediate' | 'advanced';  // Required
  region: string;               // Required: Body region
  title: string;                // Required: Case title
  patient: {                     // Required: Patient info
    profile: string;
  };
  scenario: string;             // Required: Case scenario
  signs: Array<{                // Required: Clinical signs
    text: string;
    category: 'green' | 'yellow' | 'red';  // Sign category
    key: boolean;                // Is this a key sign?
  }>;
  correctDecision: 'safe_to_train' | 'refer_to_medical' | 'modify_with_caution';  // Required
  explanation: string;          // Required: Explanation of decision
  recommendedApproach?: string[];  // Optional: Recommended approach
}
```

#### Validation Rules
- `id` must be unique numeric
- `signs` must have at least one sign
- `correctDecision` must be one of the three valid values
- Sign categories: green (favorable), yellow (caution), red (red flag)

#### Example
```json
{
  "id": 1,
  "difficulty": "easy",
  "region": "lumbar",
  "title": "Postural low back pain in office worker",
  "patient": {
    "profile": "Female, 34 years old, office worker"
  },
  "scenario": "34-year-old female client presents with low back pain...",
  "signs": [
    {
      "text": "Pain 4/10 at rest, 6/10 after prolonged sitting",
      "category": "green",
      "key": true
    },
    {
      "text": "No radiation to lower limbs",
      "category": "green",
      "key": true
    }
  ],
  "correctDecision": "safe_to_train",
  "explanation": "All signs are favorable (green). Pain is mild, localized...",
  "recommendedApproach": [
    "Address postural habits",
    "Strengthen core stabilizers"
  ]
}
```

### 6. Quiz Question

**File**: `quizQuestions.json`  
**Type**: `QuizQuestionsByTopic` (object with topic IDs as keys)  
**Purpose**: Quiz questions organized by topic

#### Schema
```typescript
interface QuizQuestion {
  id: string;                    // Required: Unique ID
  question: string;              // Required: Question text
  options: string[];            // Required: Array of answer options
  correct: number;              // Required: Index of correct answer (0-based)
  explanation: string;         // Required: Explanation of correct answer
}

interface QuizQuestionsByTopic {
  [topicId: string]: QuizQuestion[];  // e.g., "biomechanics", "assessment"
}
```

#### Validation Rules
- `correct` must be a valid index in `options` array
- `options` must have at least 2 options
- All topic IDs must exist in `quizTopics.json`

#### Example
```json
{
  "biomechanics": [
    {
      "id": "q_001",
      "question": "What is the primary mechanism of knee valgus?",
      "options": [
        "Femoral internal rotation and adduction",
        "Tibial external rotation",
        "Ankle dorsiflexion",
        "Hip extension"
      ],
      "correct": 0,
      "explanation": "Knee valgus results primarily from inadequate eccentric control of femoral adduction/internal rotation."
    }
  ]
}
```

### 7. Quiz Topic

**File**: `quizTopics.json`  
**Type**: `QuizTopic[]` (array of QuizTopic objects)  
**Purpose**: Metadata for quiz topics

#### Schema
```typescript
interface QuizTopic {
  id: string;                   // Required: Topic ID (matches key in quizQuestions)
  title: string;                // Required: Topic title
  questions: number;            // Required: Number of questions
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';  // Required
  timeEstimate: string;         // Required: e.g., "10-15 min"
}
```

#### Validation Rules
- `id` must match a key in `quizQuestions.json`
- `questions` should match actual question count

### 8. Glossary

**File**: `glossary.json`  
**Type**: `GlossaryTerm` (object with term keys)  
**Purpose**: Glossary of terms

#### Schema
```typescript
interface GlossaryTerm {
  [term: string]: string;  // Term -> Definition mapping
}
```

#### Example
```json
{
  "Knee Valgus": "Medial collapse of the knee during movement",
  "Scapular Dyskinesis": "Abnormal movement of the scapula"
}
```

### 9. Questionnaire

**File**: `client-questionnaire.json`, `physical-activity-readiness.json`, `movement-analysis-*.json`  
**Type**: `Questionnaire`  
**Purpose**: Form-based questionnaires (send-by-link forms support EN/ES).

**Bilingual requirement**: All user-facing text fields are `Translatable`: `{ "en": string, "es": string }`. Both keys are required. See `.cursor/rules/forms-bilingual.md`.

#### Schema
```typescript
type FormLang = 'en' | 'es';
interface Translatable { en: string; es: string; }

interface Questionnaire {
  id?: string;
  name: Translatable;
  abbreviation?: string;
  description?: Translatable;
  type: 'form';
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
      options?: Array<{ value: string; label: Translatable }>;
      showWhen?: { questionId: string; values: string[] };
    }>;
  }>;
}
```

#### Validation Rules
- `type` must be `'form'`
- Question IDs must be unique within questionnaire
- Every Translatable field must have both `en` and `es`

### 10. Functional Scale

**File**: `lefs.json`, `uefi.json`  
**Type**: `FunctionalScale`  
**Purpose**: Functional assessment scales (send-by-link; EN/ES).

**Bilingual requirement**: `name`, each item in `questions`, and each `options[].label` are `Translatable`. Both `en` and `es` required. See `.cursor/rules/forms-bilingual.md`.

#### Schema
```typescript
interface FunctionalScale {
  id?: string;
  name: Translatable;
  abbreviation: string;
  type: 'scale';
  maxScore: number;
  minScore: number;
  questions: Translatable[];
  options: Array<{ value: number; label: Translatable }>;
}
```

#### Validation Rules
- `type` must be `'scale'`
- `maxScore` must be >= `minScore`
- Every Translatable field must have both `en` and `es`
- Score calculation: Sum of selected option values

## Referential Integrity Rules

### Cross-Collection References

1. **Pattern → Assessment**: `patterns.assessment_ids` → `assessments.id`
2. **Pattern → Exercise**: `patterns.exercise_ids` → `exercises.id`
3. **Pattern → Condition**: `patterns.condition_ids` → `conditions.id` (optional)
4. **Pattern → Pattern**: `patterns.related_patterns` → `patterns.id` (optional)
5. **Condition → Assessment**: `conditions.assessment_ids` → `assessments.id`
6. **Condition → Exercise**: `conditions.exercise_ids` → `exercises.id`
7. **Exercise → Pattern**: `exercises.pattern_ids` → `patterns.id` (optional, bidirectional)

### Bidirectional Consistency

If `exercises.pattern_ids` exists:
- Ensure corresponding `patterns.exercise_ids` includes the exercise ID
- Maintain symmetric relationships

### Validation Checklist

When editing data, verify:
- [ ] All IDs follow naming convention (p__*, a__*, e__*, c__*)
- [ ] All referenced IDs exist in their collections
- [ ] No duplicate IDs within any collection
- [ ] No duplicate IDs in any `*_ids` array
- [ ] Bidirectional relationships are symmetric (if both sides defined)
- [ ] JSON is valid (syntax check)
- [ ] TypeScript types match JSON structure

## Data Loading

### Loading Functions

All data is loaded via `src/utils/dataLoader.ts`:
- `loadPatterns()` → `Pattern[]`
- `loadAssessments()` → `Assessment[]`
- `loadExercises()` → `ExercisesByCategory`
- `loadConditions()` → `Condition[]`
- `loadClinicalCases()` → `ClinicalCase[]`
- `loadQuizQuestions()` → `QuizQuestionsByTopic`
- `loadQuizTopics()` → `QuizTopic[]`
- `loadGlossary()` → `GlossaryTerm`
- `loadAllQuestionnaires()` → `Record<string, Questionnaire>`
- `loadAllFunctionalScales()` → `Record<string, FunctionalScale>`
- `loadAllData()` → Loads all data in parallel

### Error Handling

- Missing files return empty arrays/objects
- Invalid JSON is caught and logged
- Type mismatches are logged as warnings
- Application continues with available data

## Data Maintenance

### Adding New Items

1. **Choose ID**: Follow naming convention
2. **Add to JSON**: Add item to appropriate file
3. **Set References**: Add IDs to `*_ids` arrays
4. **Verify**: Check referential integrity
5. **Test**: Load and display in application

### Modifying Items

1. **Backup**: Consider backing up JSON file
2. **Update**: Modify item in JSON
3. **Verify**: Check all references still valid
4. **Test**: Verify changes in application

### Removing Items

1. **Check References**: Find all items referencing this ID
2. **Remove References**: Remove ID from all `*_ids` arrays
3. **Remove Item**: Delete item from JSON
4. **Verify**: Check no broken references remain

## Best Practices

### Data Entry
- Use consistent terminology
- Provide complete information
- Include references when available
- Use clear, descriptive names
- Follow ID naming convention strictly

### Relationships
- Keep references minimal but complete
- Maintain bidirectional consistency
- Document complex relationships
- Verify referential integrity regularly

### Validation
- Validate JSON syntax
- Check referential integrity
- Verify TypeScript type compliance
- Test data loading in application

## References
- TypeScript types: `src/types/index.ts`
- Data loader: `src/utils/dataLoader.ts`
- Architecture spec: `docs/ARCHITECTURE_SPEC.md`
- Cursor rules: `.cursorrules`

