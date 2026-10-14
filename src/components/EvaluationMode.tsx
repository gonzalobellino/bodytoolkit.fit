import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Check, X, Clock, Trophy, RotateCcw } from 'lucide-react';
import type { Pattern, Assessment, ExercisesByCategory } from '../types';
import {
  generateQuestionsWithConfig,
  type EvaluationQuestion,
  type EvaluationConfig,
} from '../utils/evaluationUtils';

interface EvaluationModeProps {
  onBack: () => void;
  patterns: Pattern[];
  assessments: Assessment[];
  exercises: ExercisesByCategory;
}

export function EvaluationMode({ onBack, patterns, assessments, exercises }: EvaluationModeProps) {
  const [config, setConfig] = useState<EvaluationConfig>({
    zone: 'all',
    count: 10,
    difficulty: 'medium',
    timer: 0
  });
  const [setupMode, setSetupMode] = useState(true);
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Array<{ question: EvaluationQuestion; userAnswer: string | string[] | boolean | null; isCorrect: boolean }>>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentQ = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const recordAnswer = useCallback((question: EvaluationQuestion, userAnswer: string | string[] | boolean | null, isCorrect: boolean) => {
    setAnswers(prev => [...prev, { question, userAnswer, isCorrect }]);
  }, []);

  const handleNext = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setTimeRemaining(config.timer);
    } else {
      setCompleted(true);
    }
  }, [config.timer, currentQuestion, questions.length]);

  const handleTimeUp = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (currentQ) {
      recordAnswer(currentQ, null, false);
    }
    setShowFeedback(true);
    setTimeout(() => {
      handleNext();
    }, 2000);
  }, [currentQ, handleNext, recordAnswer]);

  // Timer effect
  useEffect(() => {
    if (config.timer > 0 && !setupMode && !completed && currentQ) {
      setTimeRemaining(config.timer);
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentQuestion, setupMode, completed, config.timer, currentQ, handleTimeUp]);

  const handleStart = useCallback(() => {
    const generated = generateQuestionsWithConfig(config, patterns, assessments, exercises);
    setQuestions(generated);
    setSetupMode(false);
    setCurrentQuestion(0);
    setScore(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCompleted(false);
  }, [assessments, config, exercises, patterns]);

  const handleAnswer = useCallback((answer: string | string[] | boolean) => {
    if (showFeedback || completed) return;
    // For True/False questions, convert string to boolean
    if (currentQ?.type === 'trueFalse') {
      const boolAnswer = answer === 'True' || answer === true;
      setSelectedAnswer(boolAnswer);
    } else {
      setSelectedAnswer(answer);
    }
  }, [completed, showFeedback, currentQ]);

  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null || showFeedback) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    let isCorrect = false;
    if (currentQ.type === 'trueFalse') {
      // Convert string to boolean if needed, then compare
      const userAnswer = typeof selectedAnswer === 'string' 
        ? selectedAnswer === 'True' 
        : selectedAnswer;
      isCorrect = userAnswer === currentQ.correctAnswer;
    } else if (currentQ.type === 'multiselect') {
      // For multiselect, compare arrays
      const userAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer];
      const correctAnswers = Array.isArray(currentQ.correctAnswers) ? currentQ.correctAnswers : [];
      isCorrect = correctAnswers.every(ans => userAnswers.includes(ans)) && userAnswers.length === correctAnswers.length;
    } else {
      isCorrect = selectedAnswer === currentQ.correctAnswer;
    }

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    recordAnswer(currentQ, selectedAnswer, isCorrect);
    setShowFeedback(true);
  }, [completed, currentQ, selectedAnswer, showFeedback, recordAnswer]);

  const handleRestart = useCallback(() => {
    setSetupMode(true);
    setQuestions([]);
    setCurrentQuestion(0);
    setScore(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCompleted(false);
    setTimeRemaining(0);
  }, []);

  // Calculate if answer is correct (only when feedback is shown)
  // Must be before any conditional returns to comply with Rules of Hooks
  const isCorrect = useMemo(() => {
    if (!showFeedback || selectedAnswer === null || !currentQ) return null;
    
    if (currentQ.type === 'trueFalse') {
      const userAnswer = typeof selectedAnswer === 'string' 
        ? selectedAnswer === 'True' 
        : typeof selectedAnswer === 'boolean'
        ? selectedAnswer
        : false;
      return userAnswer === currentQ.correctAnswer;
    } else if (currentQ.type === 'multiselect') {
      const userAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer];
      const correctAnswers = Array.isArray(currentQ.correctAnswers) ? currentQ.correctAnswers : [];
      return correctAnswers.every(ans => userAnswers.includes(ans)) && userAnswers.length === correctAnswers.length;
    } else {
      return selectedAnswer === currentQ.correctAnswer;
    }
  }, [showFeedback, selectedAnswer, currentQ]);

  if (setupMode) {
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
                  <div className="text-slate-900">Dynamic Evaluation</div>
                  <div className="text-xs text-slate-500">Configure Your Assessment</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <h2 className="text-slate-900 mb-6">Evaluation Configuration</h2>

            {/* Zone Selection */}
            <div className="mb-6">
              <label className="block text-sm text-slate-700 mb-3">Body Zone</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'upper', 'lower', 'core'] as const).map(zone => (
                  <button
                    key={zone}
                    onClick={() => setConfig(prev => ({ ...prev, zone }))}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      config.zone === zone
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {zone === 'all' ? 'All Zones' : zone.charAt(0).toUpperCase() + zone.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div className="mb-6">
              <label className="block text-sm text-slate-700 mb-3">Number of Questions</label>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 20].map(count => (
                  <button
                    key={count}
                    onClick={() => setConfig(prev => ({ ...prev, count }))}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      config.count === count
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <label className="block text-sm text-slate-700 mb-3">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {(['easy', 'medium', 'hard'] as const).map(difficulty => (
                  <button
                    key={difficulty}
                    onClick={() => setConfig(prev => ({ ...prev, difficulty }))}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      config.difficulty === difficulty
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="mb-8">
              <label className="block text-sm text-slate-700 mb-3">Timer (seconds, 0 = no timer)</label>
              <div className="flex flex-wrap gap-2">
                {[0, 30, 60, 90, 120].map(timer => (
                  <button
                    key={timer}
                    onClick={() => setConfig(prev => ({ ...prev, timer }))}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      config.timer === timer
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {timer === 0 ? 'No Timer' : `${timer}s`}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Start Evaluation
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleRestart}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <div className="text-slate-900">Evaluation Complete</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-slate-900 text-3xl mb-2">Evaluation Complete!</h2>
            <div className="text-4xl font-bold text-violet-600 mb-4">
              {score} / {questions.length}
            </div>
            <div className="text-2xl text-slate-600 mb-6">{percentage}%</div>

            {percentage >= 80 ? (
              <p className="text-emerald-600 text-lg">Excellent work! You have a strong understanding.</p>
            ) : percentage >= 60 ? (
              <p className="text-blue-600 text-lg">Good job! Review the questions you missed to strengthen your knowledge.</p>
            ) : (
              <p className="text-amber-600 text-lg">Keep studying! Review the material and try again.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="text-slate-900 mb-4">Review Answers</h3>
            <div className="space-y-4">
              {answers.map((answer, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    answer.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {answer.isCorrect ? (
                      <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm text-slate-900 mb-1">
                        {idx + 1}. {answer.question.question}
                      </div>
                      <div className="text-xs text-slate-600">
                        {answer.isCorrect ? 'Correct' : `Incorrect. ${answer.question.explanation}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>New Evaluation</span>
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Back to Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Loading questions...</p>
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
                <div className="text-slate-900">Dynamic Evaluation</div>
                <div className="text-xs text-slate-500">
                  Question {currentQuestion + 1} of {questions.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {config.timer > 0 && timeRemaining > 0 && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                  timeRemaining <= 10 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>{timeRemaining}s</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-lg">
                <Trophy className="w-4 h-4" />
                <span>{score} / {questions.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-2 bg-slate-200">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Educational Disclaimer Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-slate-600 text-center">
            <span className="font-medium text-slate-700">Note:</span> This content is for educational purposes only and is not intended as medical advice. Information presented reflects educational concepts used in movement assessment and corrective exercise contexts.
          </p>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
          <div className="mb-4">
            <span className="text-xs px-3 py-1 bg-violet-100 text-violet-700 rounded-full">
              {currentQ.type === 'identify' ? '🔍 Identification' :
               currentQ.type === 'corrective' ? '💪 Corrective Exercise' :
               currentQ.type === 'trueFalse' ? '✓✗ True or False' :
               currentQ.type === 'fillBlank' ? '📝 Fill In' :
               currentQ.type === 'clinicalScenario' ? '🏥 Clinical Scenario' :
               currentQ.type === 'matching' ? '🔗 Matching' :
               currentQ.type === 'multiselect' ? '☑️ Multiple Select' :
               '❓ Question'}
            </span>
          </div>

          <h3 className="text-slate-900 mb-4 text-lg leading-relaxed whitespace-pre-line">
            {currentQ.question}
          </h3>

          {currentQ.statement && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-slate-700 italic">&ldquo;{currentQ.statement}&rdquo;</p>
            </div>
          )}

          {currentQ.scenario && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-slate-700">{currentQ.scenario}</p>
            </div>
          )}

          {currentQ.hint && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700">💡 Hint: {currentQ.hint}</p>
            </div>
          )}

          {/* Answer Options */}
          {currentQ.type === 'matching' ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600">
                Matching questions are not yet fully implemented. This question will be skipped.
              </p>
            </div>
          ) : currentQ.options && currentQ.options.length > 0 ? (
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
              // For True/False, check if this option matches the correct boolean answer
              const isOptionCorrect = currentQ.type === 'trueFalse'
                ? (option === 'True' && currentQ.correctAnswer === true) || (option === 'False' && currentQ.correctAnswer === false)
                : option === currentQ.correctAnswer || (Array.isArray(currentQ.correctAnswer) && currentQ.correctAnswer.includes(option));
              
              const isSelected = currentQ.type === 'trueFalse'
                ? (option === 'True' && selectedAnswer === true) || (option === 'False' && selectedAnswer === false)
                : selectedAnswer === option || (Array.isArray(selectedAnswer) && selectedAnswer.includes(option));
              
              let optionStyle = 'border-slate-200 hover:border-violet-300 hover:bg-violet-50';
              
              if (showFeedback) {
                if (isOptionCorrect) {
                  optionStyle = 'border-emerald-500 bg-emerald-50';
                } else if (isSelected && !isOptionCorrect) {
                  optionStyle = 'border-red-500 bg-red-50';
                } else {
                  optionStyle = 'border-slate-200 bg-slate-50 opacity-60';
                }
              } else if (isSelected) {
                optionStyle = 'border-violet-500 bg-violet-50';
              }

              return (
                <button
                  key={idx}
                  onClick={() => !showFeedback && handleAnswer(option)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${optionStyle} ${
                    showFeedback ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">{option}</span>
                    {showFeedback && isOptionCorrect && (
                      <Check className="w-5 h-5 text-emerald-600" />
                    )}
                    {showFeedback && isSelected && !isOptionCorrect && (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                ⚠️ This question has no available options. Please skip to the next question.
              </p>
            </div>
          )}

          {/* Feedback - Always show explanation after submitting */}
          {showFeedback && currentQ.explanation && (
            <div className={`mt-6 p-4 rounded-xl border-l-4 ${
              isCorrect === true
                ? 'bg-emerald-50 border-emerald-500'
                : 'bg-blue-50 border-blue-500'
            }`}>
              <div className="text-sm text-slate-900 mb-1 font-medium">
                {isCorrect === true ? '✓ Correct!' : isCorrect === false ? '✗ Incorrect' : 'Explanation'}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Progress: {currentQuestion + 1} / {questions.length}
          </div>

          {!showFeedback ? (
            <button
              onClick={handleSubmit}
              disabled={selectedAnswer === null || (currentQ.type === 'matching') || !currentQ.options || currentQ.options.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{currentQ.type === 'matching' || !currentQ.options || currentQ.options.length === 0 ? 'Skip Question' : 'Submit Answer'}</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
            >
              <span>{currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
