import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Brain, Trophy, Clock, Target, Zap } from 'lucide-react';
import { QuizMode } from './QuizMode';
import { EvaluationMode } from './EvaluationMode';
import type { QuizQuestion, QuizQuestionsByTopic, QuizTopic, Pattern, Assessment, ExercisesByCategory } from '../types';
import type { MuscleChartsData } from '../utils/dataLoader';
import { generateQuizQuestions } from '../utils/quizQuestionGenerator';

interface PracticeSectionProps {
  onBack: () => void;
  quizQuestions?: QuizQuestionsByTopic; // Deprecated, kept for backward compatibility but not used
  quizTopics: QuizTopic[];
  patterns?: Pattern[];
  assessments?: Assessment[];
  exercises?: ExercisesByCategory;
  muscleCharts?: MuscleChartsData | null;
}

type PracticeMode = 'quiz' | 'evaluation' | null;

export function PracticeSection({ onBack, quizQuestions, quizTopics, patterns = [], assessments = [], exercises = {}, muscleCharts = null }: PracticeSectionProps): React.JSX.Element {
  // quizQuestions prop is deprecated - questions are now generated dynamically
  const [mode, setMode] = useState<PracticeMode>('quiz');
  const [activeQuizTopic, setActiveQuizTopic] = useState<string | null>(null);
  const [evaluationActive, setEvaluationActive] = useState(false);
  const [completedQuizzes, setCompletedQuizzes] = useState<Record<string, number>>({});
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<string, QuizQuestion[]>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);
  const [quizKey, setQuizKey] = useState(0);

  const handleQuizComplete = (topicId: string, score: number): void => {
    setCompletedQuizzes({
      ...completedQuizzes,
      [topicId]: Math.max(completedQuizzes[topicId] ?? 0, score)
    });
  };

  const handleExitQuiz = (): void => {
    if (activeQuizTopic) {
      setGeneratedQuestions(prev => {
        const next = { ...prev };
        delete next[activeQuizTopic];
        return next;
      });
    }
    setActiveQuizTopic(null);
    setMode('quiz');
  };

  const handleRestartQuiz = (): void => {
    if (!activeQuizTopic) return;
    setGeneratedQuestions(prev => {
      const next = { ...prev };
      delete next[activeQuizTopic];
      return next;
    });
    setQuizKey(k => k + 1);
    generateQuestionsForTopic(activeQuizTopic);
  };

  // Generate questions for a topic dynamically
  const generateQuestionsForTopic = async (topicId: string): Promise<QuizQuestion[]> => {
    const topic = quizTopics.find(t => t.id === topicId);
    if (!topic || !topic.knowledgeBase || !topic.questionTypes) {
      return [];
    }

    setLoadingQuestions(topicId);
    try {
      const questions = await generateQuizQuestions(
        topicId,
        topic.knowledgeBase,
        topic.questionTypes,
        topic.questionCount,
        patterns,
        assessments,
        exercises,
        muscleCharts || undefined
      );
      
      setGeneratedQuestions(prev => ({
        ...prev,
        [topicId]: questions
      }));
      
      setLoadingQuestions(null);
      return questions;
    } catch (error) {
      console.error(`Error generating questions for topic ${topicId}:`, error);
      setLoadingQuestions(null);
      return [];
    }
  };

  // Calculate stats from actual data
  const totalQuizzesCompleted = Object.keys(completedQuizzes).length;
  const allScores = Object.entries(completedQuizzes).map(([topicId, score]) => {
    const questions = generatedQuestions[topicId] || [];
    const topic = quizTopics.find(t => t.id === topicId);
    const questionCount = questions.length > 0 ? questions.length : (topic?.questionCount || 0);
    return questionCount > 0 ? (score / questionCount) * 100 : 0;
  });
  const averageScore = allScores.length > 0 
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;
  
  // Calculate total practice time based on quiz topics (estimate)
  const totalQuestionsFromTopics = quizTopics.reduce((sum, topic) => sum + topic.questionCount, 0);
  const estimatedMinutesPerQuestion = 0.8;
  const totalPracticeHours = (totalQuestionsFromTopics * estimatedMinutesPerQuestion * totalQuizzesCompleted) / 60;

  // Load questions when topic is selected
  useEffect(() => {
    if (activeQuizTopic && mode === 'quiz' && !generatedQuestions[activeQuizTopic] && !loadingQuestions) {
      generateQuestionsForTopic(activeQuizTopic);
    }
  }, [activeQuizTopic, mode]);

  if (activeQuizTopic && mode === 'quiz') {
    const topic = quizTopics.find(t => t.id === activeQuizTopic);
    const questions = generatedQuestions[activeQuizTopic] || [];
    
    if (loadingQuestions === activeQuizTopic) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-600 text-lg mb-2">Generating questions...</div>
            <div className="text-slate-400 text-sm">Please wait</div>
          </div>
        </div>
      );
    }
    
    if (questions.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-600 text-lg mb-2">No questions available</div>
            <button
              onClick={handleExitQuiz}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
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
                  onClick={handleExitQuiz}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <div className="text-slate-900">{topic?.title}</div>
                  <div className="text-xs text-slate-500">Quiz Mode</div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <QuizMode
            key={quizKey}
            questions={questions}
            topicTitle={topic?.title ?? ''}
            onComplete={(score) => handleQuizComplete(activeQuizTopic, score)}
            onExit={handleExitQuiz}
            onRestart={handleRestartQuiz}
          />
        </div>
      </div>
    );
  }

  if (evaluationActive && mode === 'evaluation') {
    return (
      <EvaluationMode
        onBack={() => {
          setEvaluationActive(false);
          setMode('quiz');
        }}
        patterns={patterns}
        assessments={assessments}
        exercises={exercises}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
                <div className="text-slate-900">Practice</div>
                <div className="text-xs text-slate-500">Test Your Knowledge</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Toggle */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setMode('quiz')}
              className={`px-6 py-4 relative transition-colors ${
                mode === 'quiz'
                  ? 'text-violet-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span>Quiz Topics</span>
              </div>
              {mode === 'quiz' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600"></div>
              )}
            </button>
            <button
              onClick={() => setMode('evaluation')}
              className={`px-6 py-4 relative transition-colors ${
                mode === 'evaluation'
                  ? 'text-violet-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Dynamic Evaluation</span>
              </div>
              {mode === 'evaluation' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600"></div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mode === 'quiz' ? (
          <div>
            <div className="mb-8">
              <h2 className="text-slate-900 mb-2">Quiz Topics</h2>
              <p className="text-slate-600">
                Test your understanding of movement patterns, assessments, and exercise selection.
              </p>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="text-3xl mb-1">{totalQuizzesCompleted}</div>
                <div className="text-violet-100 text-sm">Quizzes Completed</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="text-3xl text-slate-900 mb-1">
                  {totalQuizzesCompleted > 0 ? `${averageScore}%` : '—'}
                </div>
                <div className="text-slate-600 text-sm">Average Score</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="text-3xl text-slate-900 mb-1">
                  {totalQuizzesCompleted > 0 ? `${totalPracticeHours.toFixed(1)}h` : '—'}
                </div>
                <div className="text-slate-600 text-sm">Practice Time</div>
              </div>
            </div>

            {/* Quiz Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {quizTopics.map((quiz) => {
                const questionsForTopic = generatedQuestions[quiz.id] || [];
                const completed = completedQuizzes[quiz.id] !== undefined;
                const score = completedQuizzes[quiz.id] ?? 0;
                const questionCount = questionsForTopic.length > 0 ? questionsForTopic.length : quiz.questionCount;
                const percentage = completed && questionCount > 0 ? Math.round((score / questionCount) * 100) : 0;

                return (
                  <div
                    key={quiz.id}
                    onClick={() => {
                      setActiveQuizTopic(quiz.id);
                      setMode('quiz');
                    }}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-violet-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-slate-900 mb-2 group-hover:text-violet-600 transition-colors">
                          {quiz.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            <span>{quiz.questionCount} questions</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{quiz.timeEstimate}</span>
                          </div>
                        </div>
                      </div>
                      {completed && (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>

                    {completed && (
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 mb-1">Best Score</div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-600 mt-1">{percentage}%</div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          quiz.difficulty === 'Beginner'
                            ? 'bg-green-100 text-green-700'
                            : quiz.difficulty === 'Intermediate'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {quiz.difficulty}
                      </span>
                      <button className="text-sm text-violet-600 group-hover:text-violet-700">
                        {completed ? 'Retake' : 'Start Quiz'} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-slate-900 mb-2">Dynamic Evaluation</h2>
              <p className="text-slate-600">
                Generate custom questions from movement patterns. Configure difficulty, zone, and question count.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-8">
              <div className="text-center py-12">
                <Zap className="w-16 h-16 text-violet-500 mx-auto mb-4" />
                <h3 className="text-slate-900 mb-2">Ready to Start?</h3>
                <p className="text-slate-600 mb-6">
                  Generate questions dynamically from {patterns.length} movement patterns
                </p>
                <button
                  onClick={() => setEvaluationActive(true)}
                  className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Start Evaluation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
