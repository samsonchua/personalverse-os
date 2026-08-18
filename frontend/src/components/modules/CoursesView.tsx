import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GraduationCap, Plus, X, Trash2, ChevronLeft, Check, CircleCheck, BookOpen } from 'lucide-react';
import { coursesApi } from '../../api/coursesClient';
import { CourseSummary, CourseDetail, CourseLesson, QuizAttemptResult } from '../../types';

export const CoursesView: React.FC = () => {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [industry, setIndustry] = useState('');
  const [generating, setGenerating] = useState(false);

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<QuizAttemptResult | null>(null);

  const loadList = () => coursesApi.list().then(setCourses);
  useEffect(() => { loadList(); }, []);

  const openCourse = async (id: string) => {
    const detail = await coursesApi.getDetail(id);
    setSelectedCourse(detail);
    const firstLesson = detail.modules[0]?.lessons[0];
    setActiveLessonId(firstLesson?.id ?? null);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry.trim()) return;
    setGenerating(true);
    try {
      const created = await coursesApi.generate(industry.trim());
      setIndustry('');
      setShowForm(false);
      await loadList();
      await openCourse(created.id);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await coursesApi.remove(id);
    if (selectedCourse?.id === id) setSelectedCourse(null);
    await loadList();
  };

  const activeLesson: CourseLesson | undefined = selectedCourse?.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === activeLessonId);

  const selectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleMarkComplete = async () => {
    if (!activeLesson || !selectedCourse) return;
    await coursesApi.completeLesson(activeLesson.id);
    await openCourse(selectedCourse.id);
    setActiveLessonId(activeLesson.id);
  };

  const handleSubmitQuiz = async () => {
    if (!activeLesson || !selectedCourse) return;
    const answers = activeLesson.quiz.map((_, i) => quizAnswers[i] ?? -1);
    const result = await coursesApi.attemptQuiz(activeLesson.id, answers);
    setQuizResult(result);
    const refreshed = await coursesApi.getDetail(selectedCourse.id);
    setSelectedCourse(refreshed);
  };

  if (selectedCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold">
            <ChevronLeft className="w-4 h-4" /> Back to Courses
          </button>
          <span className="text-xs text-cyan-400 font-bold">{selectedCourse.progress_pct}% complete</span>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white">{selectedCourse.title}</h2>
          <p className="text-xs text-slate-400">{selectedCourse.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Module/Lesson Nav */}
          <GlassCard hoverEffect={false} className="lg:col-span-1 space-y-3 max-h-[36rem] overflow-y-auto">
            {selectedCourse.modules.map((module) => (
              <div key={module.id} className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{module.title}</p>
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(lesson.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${
                      activeLessonId === lesson.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    {lesson.is_completed ? <CircleCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-50" />}
                    <span className="truncate">{lesson.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </GlassCard>

          {/* Lesson Content */}
          <GlassCard hoverEffect={false} className="lg:col-span-3 space-y-4">
            {activeLesson ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-lg">{activeLesson.title}</h3>
                  {!activeLesson.is_completed && (
                    <button onClick={handleMarkComplete} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Mark Complete
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{activeLesson.content}</p>

                {activeLesson.quiz.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h4 className="font-bold text-white text-sm">Quiz</h4>
                    {activeLesson.quiz.map((q, qi) => (
                      <div key={q.id} className="space-y-2">
                        <p className="text-xs text-slate-200 font-semibold">{qi + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => {
                            const isSelected = quizAnswers[qi] === oi;
                            const showFeedback = !!quizResult;
                            const result = quizResult?.results[qi];
                            const isCorrectOpt = showFeedback && result?.correct_index === oi;
                            const isWrongSelected = showFeedback && isSelected && !result?.is_correct;
                            return (
                              <button
                                key={oi}
                                disabled={showFeedback}
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))}
                                className={`text-left px-3 py-2 rounded-xl text-xs border ${
                                  isCorrectOpt ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
                                  isWrongSelected ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' :
                                  isSelected ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' :
                                  'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800/60'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {quizResult && q.explanation && <p className="text-[11px] text-slate-500 italic">{q.explanation}</p>}
                      </div>
                    ))}
                    {!quizResult ? (
                      <button onClick={handleSubmitQuiz} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs">
                        Submit Quiz
                      </button>
                    ) : (
                      <p className="text-xs font-bold text-cyan-300">Score: {quizResult.correct}/{quizResult.total} ({quizResult.score_pct}%)</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500 text-center py-10">Select a lesson to begin.</p>
            )}
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Interactive Courses</h2>
          <p className="text-xs text-slate-400">Learn any industry — generate a structured course with lessons and quizzes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Course
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Generate a Course</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleGenerate} className="flex gap-2">
            <input required placeholder="Industry or topic (e.g. Semiconductor Manufacturing, Real Estate, Aviation)" value={industry} onChange={(e) => setIndustry(e.target.value)} className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <button type="submit" disabled={generating} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50 whitespace-nowrap">
              {generating ? 'Generating...' : 'Generate Course'}
            </button>
          </form>
          <p className="text-[10px] text-slate-500">Uses the configured AI provider for real, researched content; without one, generates a generic starter outline you can build on.</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <GlassCard key={c.id} onClick={() => openCourse(c.id)} className="space-y-3">
            <div className="flex items-start justify-between">
              <GraduationCap className="w-5 h-5 text-cyanAccent" />
              <button onClick={(e) => handleDelete(c.id, e)} className="text-slate-500 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">{c.title}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">{c.description}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="px-1.5 py-0.5 rounded bg-slate-800">{c.difficulty}</span>
              <span>{c.estimated_hours}h</span>
              {c.source === 'ai_generated' && <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">AI</span>}
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${c.progress_pct}%` }} />
            </div>
          </GlassCard>
        ))}
        {!courses.length && (
          <GlassCard hoverEffect={false} className="md:col-span-2 lg:col-span-3 text-center py-10">
            <p className="text-xs text-slate-500">No courses yet — generate one above to start learning an industry.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};
