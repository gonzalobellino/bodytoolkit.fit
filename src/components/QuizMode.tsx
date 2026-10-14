import React, { useState, useMemo } from 'react';
import { Check, X, ArrowRight, RotateCcw } from 'lucide-react';
import type { QuizQuestion } from '../types';

interface QuizModeProps {
  questions: QuizQuestion[];
  topicTitle: string;
  onComplete: (score: number) => void;
  onExit: () => void;
  onRestart?: () => void;
}

export function QuizMode({ questions, topicTitle, onComplete, onExit, onRestart }: QuizModeProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | number[] | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isMultiSelect = Array.isArray(currentQuestion.correct);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Check if answer is correct (handles both single and multiselect)
  const isCorrect = React.useMemo(() => {
    if (selectedAnswer === null) return false;
    
    if (isMultiSelect) {
      const correctArray = currentQuestion.correct as number[];
      const selectedArray = Array.isArray(selectedAnswer) ? selectedAnswer : [];
      
      if (correctArray.length !== selectedArray.length) return false;
      
      // Sort both arrays and compare
      const sortedCorrect = [...correctArray].sort((a, b) => a - b);
      const sortedSelected = [...selectedArray].sort((a, b) => a - b);
      
      return sortedCorrect.every((val, idx) => val === sortedSelected[idx]);
    } else {
      return selectedAnswer === currentQuestion.correct;
    }
  }, [selectedAnswer, currentQuestion.correct, isMultiSelect]);

  const handleAnswerSelect = (index: number): void => {
    if (showExplanation) return;
    
    if (isMultiSelect) {
      setSelectedAnswer(prev => {
        const currentArray = Array.isArray(prev) ? prev : [];
        if (currentArray.includes(index)) {
          // Deselect if already selected
          return currentArray.filter(i => i !== index);
        } else {
          // Select if not already selected
          return [...currentArray, index];
        }
      });
    } else {
      // Single choice: toggle off if clicking the already-selected option
      setSelectedAnswer(prev => prev === index ? null : index);
    }
  };

  const handleSubmit = (): void => {
    if (selectedAnswer === null || (isMultiSelect && (selectedAnswer as number[]).length === 0)) return;
    setShowExplanation(true);
    if (isCorrect) {
      setScore(score + 1);
    }
  };

  const handleNext = (): void => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setCompleted(true);
      onComplete(score + (isCorrect ? 1 : 0));
    }
  };

  const handleRestart = (): void => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setCompleted(false);
  };

  if (completed) {
    const percentage = Math.round(((score + (isCorrect ? 1 : 0)) / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl text-white">{percentage}%</span>
        </div>
        <h2 className="text-slate-900 mb-4">Quiz Complete!</h2>
        <p className="text-slate-600 mb-8">
          You scored {score + (isCorrect ? 1 : 0)} out of {questions.length} questions correctly.
        </p>
        
        {/* Score Feedback */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          {percentage >= 80 ? (
            <p className="text-emerald-600">
              Excellent work! You have a strong understanding of {topicTitle.toLowerCase()}.
            </p>
          ) : percentage >= 60 ? (
            <p className="text-blue-600">
              Good job! Review the questions you missed to strengthen your knowledge.
            </p>
          ) : (
            <p className="text-amber-600">
              Keep studying! Review the material and try again to improve your score.
            </p>
          )}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onRestart ?? handleRestart}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Retake Quiz</span>
          </button>
          <button
            onClick={onExit}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Back to Topics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Educational Disclaimer Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-slate-600 text-center">
          <span className="font-medium text-slate-700">Note:</span> This content is for educational purposes only and is not intended as medical advice. Information presented reflects educational concepts used in movement assessment and corrective exercise contexts.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-slate-600">
            Score: {score}/{questions.length}
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
        <h3 className="text-slate-900 mb-6 leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Answer Options */}
        <div className="space-y-3">
          {isMultiSelect && (
            <p className="text-sm text-slate-500 mb-2 italic">
              Select all that apply
            </p>
          )}
          {currentQuestion.options.map((option: string, index: number) => {
            const isSelected = isMultiSelect
              ? Array.isArray(selectedAnswer) && selectedAnswer.includes(index)
              : selectedAnswer === index;
            const isCurrentCorrect = isMultiSelect
              ? (currentQuestion.correct as number[]).includes(index)
              : index === currentQuestion.correct;
            
            let optionStyle = 'border-slate-200 hover:border-violet-300 hover:bg-violet-50';
            
            if (showExplanation) {
              if (isCurrentCorrect) {
                optionStyle = 'border-emerald-500 bg-emerald-50';
              } else if (isSelected && !isCurrentCorrect) {
                optionStyle = 'border-red-500 bg-red-50';
              } else {
                optionStyle = 'border-slate-200 bg-slate-50 opacity-60';
              }
            } else if (isSelected) {
              optionStyle = 'border-violet-500 bg-violet-50';
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showExplanation}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${optionStyle} ${
                  showExplanation ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMultiSelect && (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-violet-600 bg-violet-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    )}
                    <span className="text-slate-700">{option}</span>
                  </div>
                  {showExplanation && isCurrentCorrect && (
                    <Check className="w-5 h-5 text-emerald-600" />
                  )}
                  {showExplanation && isSelected && !isCurrentCorrect && (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`mt-6 p-4 rounded-xl border-l-4 ${
            isCorrect 
              ? 'bg-emerald-50 border-emerald-500' 
              : 'bg-blue-50 border-blue-500'
          }`}>
            <div className="text-sm text-slate-900 mb-1">
              {isCorrect ? '✓ Correct!' : 'Explanation:'}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="px-6 py-3 text-slate-600 hover:text-slate-900 transition-colors"
        >
          Exit Quiz
        </button>

        {!showExplanation ? (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null || (isMultiSelect && (selectedAnswer as number[]).length === 0)}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Submit Answer</span>
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
          >
            <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
