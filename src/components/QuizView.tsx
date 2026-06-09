import React, { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, BrainCircuit, RefreshCw, ChevronRight } from 'lucide-react';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

interface QuizViewProps {
  timeframe: string;
  language: string;
}

export default function QuizView({ timeframe, language }: QuizViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);

  const generateQuiz = async () => {
    setLoading(true);
    setError('');
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setShowExplanation(false);
    setScore(0);
    
    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe, language }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quiz');
      }

      setQuizData(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while generating the quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (index: number) => {
    if (showExplanation) return; // Prevent changing answer after it's checked
    setSelectedOptionIndex(index);
  };

  const checkAnswer = () => {
    if (selectedOptionIndex === null || !quizData) return;
    
    const currentQuestion = quizData.questions[currentQuestionIndex];
    const isCorrect = selectedOptionIndex === currentQuestion.correctAnswerIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setCurrentQuestionIndex(prev => prev + 1);
    setSelectedOptionIndex(null);
    setShowExplanation(false);
  };

  if (!quizData && !loading && !error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-emerald-100 to-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <BrainCircuit className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Practice Quiz</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Test your knowledge based on {timeframe} current affairs from PIB, The Hindu, and TOI.
          </p>
          <button
            onClick={generateQuiz}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Generating Quiz</h3>
          <p className="text-sm text-slate-500">Formulating MCQs from current affairs. This may take a moment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3 shrink-0">
        <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
          !
        </div>
        <div>
          <h4 className="text-sm font-bold text-red-800">Quiz Generation Error</h4>
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
          <button
            onClick={generateQuiz}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (quizData) {
    if (currentQuestionIndex >= quizData.questions.length) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Quiz Complete!</h3>
            <p className="text-slate-600 font-medium mb-8">
              Your score: <span className="text-indigo-600 font-bold text-xl">{score}</span> / {quizData.questions.length}
            </p>
            <button
              onClick={generateQuiz}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Try Another Quiz
            </button>
          </div>
        </div>
      );
    }

    const currentQuestion = quizData.questions[currentQuestionIndex];
    
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col overflow-hidden">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 mb-1">{quizData.title}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium font-mono uppercase">
            Question {currentQuestionIndex + 1} of {quizData.questions.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-10">
          <h3 className="text-lg md:text-xl font-semibold text-slate-800 mb-8 leading-relaxed">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOptionIndex === idx;
              const isCorrect = showExplanation && idx === currentQuestion.correctAnswerIndex;
              const isWrongSelected = showExplanation && isSelected && !isCorrect;

              let optionClass = "border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 bg-white";
              if (isSelected && !showExplanation) optionClass = "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm";
              if (isCorrect) optionClass = "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm font-semibold";
              if (isWrongSelected) optionClass = "border-red-500 bg-red-50 text-red-800 shadow-sm";

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${optionClass} ${showExplanation ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="flex-1 text-sm md:text-base leading-relaxed">{option}</span>
                  {showExplanation && idx === currentQuestion.correctAnswerIndex && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-4" />
                  )}
                  {isWrongSelected && (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 ml-4" />
                  )}
                </button>
              );
            })}
          </div>

          {!showExplanation ? (
            <button
              onClick={checkAnswer}
              disabled={selectedOptionIndex === null}
              className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          ) : (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className={`p-5 rounded-2xl border ${selectedOptionIndex === currentQuestion.correctAnswerIndex ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <h4 className={`text-sm font-bold mb-2 ${selectedOptionIndex === currentQuestion.correctAnswerIndex ? 'text-emerald-800' : 'text-red-800'}`}>
                  {selectedOptionIndex === currentQuestion.correctAnswerIndex ? 'Correct!' : 'Incorrect'}
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>
              <button
                onClick={nextQuestion}
                className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                Next Question <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
