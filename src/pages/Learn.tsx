import React, { useState } from 'react';
import { COURSES, type Course } from '../data/courses';
import { useStore } from '../store';
import { go } from '../nav';
import { Icon, PageHead, Pts, Status } from '../components/ui';

function CourseRunner({ course, onClose }: { course: Course; onClose: () => void }) {
  const { state, earn, update } = useStore();
  const [step, setStep] = useState(0); // 0..lessons-1 = lesson, then quiz
  const [picked, setPicked] = useState<(number | null)[]>(course.quiz.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const already = state.coursesDone.includes(course.id);
  const inQuiz = step >= course.lessons.length;
  const correct = picked.filter((p, i) => p === course.quiz[i].answer).length;
  const passed = correct >= 2;

  const submit = () => {
    setSubmitted(true);
    if (correct >= 2 && !already) {
      update((s) => ({ ...s, coursesDone: [...s.coursesDone, course.id] }));
      earn('course', `Passed “${course.title}”`, course.points);
    }
  };

  return (
    <div className="panel course-runner">
      <div className="runner-head">
        <div>
          <div className="kicker">
            {course.level} · {course.minutes} min
          </div>
          <h2 className="h2">
            {course.title} <span className="zh">{course.zh}</span>
          </h2>
        </div>
        <button className="btn ghost" onClick={onClose}>
          Back to courses
        </button>
      </div>
      <div className="progress-dots" aria-hidden="true">
        {[...course.lessons, 'quiz'].map((_, i) => (
          <span key={i} className={i < step ? 'done' : i === step ? 'on' : ''} />
        ))}
      </div>

      {!inQuiz ? (
        <div className="lesson">
          <div className="lesson-n">
            Lesson {step + 1} of {course.lessons.length}
          </div>
          <p className="lesson-text">{course.lessons[step]}</p>
          <div className="cta-row">
            {step > 0 && (
              <button className="btn ghost" onClick={() => setStep(step - 1)}>
                Previous
              </button>
            )}
            <button className="btn primary" onClick={() => setStep(step + 1)}>
              {step === course.lessons.length - 1 ? 'Take the quiz' : 'Next lesson'}
            </button>
          </div>
        </div>
      ) : (
        <div className="quiz">
          {course.quiz.map((q, qi) => (
            <fieldset key={qi} className="q">
              <legend>
                {qi + 1}. {q.q}
              </legend>
              {q.options.map((o, oi) => {
                const chosen = picked[qi] === oi;
                const cls = submitted ? (oi === q.answer ? 'right' : chosen ? 'wrong' : '') : chosen ? 'chosen' : '';
                return (
                  <label key={oi} className={`opt ${cls}`}>
                    <input
                      type="radio"
                      id={`${course.id}-q${qi}-o${oi}`}
                      name={`${course.id}-q${qi}`}
                      checked={chosen}
                      disabled={submitted}
                      onChange={() => setPicked((p) => p.map((x, i) => (i === qi ? oi : x)))}
                    />
                    {o}
                  </label>
                );
              })}
              {submitted && <p className="explain">{q.explain}</p>}
            </fieldset>
          ))}
          {!submitted ? (
            <button className="btn primary" disabled={picked.some((p) => p === null)} onClick={submit}>
              Submit answers
            </button>
          ) : (
            <div className={`quiz-result ${passed ? 'ok' : 'retry'}`}>
              <b>
                {correct}/{course.quiz.length} correct.
              </b>{' '}
              {passed
                ? already
                  ? 'Passed again. Points are paid once per course.'
                  : `Passed. +${course.points} points.`
                : 'You need 2 of 3 to pass. Review the lessons and try again.'}
              <div className="cta-row">
                {!passed && (
                  <button
                    className="btn primary"
                    onClick={() => {
                      setPicked(course.quiz.map(() => null));
                      setSubmitted(false);
                      setStep(0);
                    }}
                  >
                    Retry
                  </button>
                )}
                {passed && (
                  <button className="btn primary" onClick={onClose}>
                    Next course
                  </button>
                )}
                {passed && course.id === 'promptsafety' && (
                  <button className="btn" onClick={() => go('rewards')}>
                    API credits are now unlocked
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Learn() {
  const { state } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const course = COURSES.find((c) => c.id === open);
  const total = COURSES.reduce((a, c) => a + c.points, 0);

  return (
    <div className="view">
      <PageHead kicker="Learn · AI literacy" title="TrustLoop Academy" zh="AI素養學院">
        Five short courses, each with three lessons and a three-question quiz. Pass with 2 of 3. The prompt safety course unlocks API credit
        rewards, so nobody gets a key before they know how to keep it safe.
      </PageHead>

      {course ? (
        <CourseRunner course={course} onClose={() => setOpen(null)} />
      ) : (
        <>
          <div className="progress-line">
            <span>
              {state.coursesDone.length} of {COURSES.length} courses passed
            </span>
            <div className="meter">
              <div style={{ width: `${(state.coursesDone.length / COURSES.length) * 100}%` }} />
            </div>
            <span className="muted">{total} points available</span>
          </div>
          <div className="course-grid">
            {COURSES.map((c) => {
              const done = state.coursesDone.includes(c.id);
              return (
                <article key={c.id} className={`course ${done ? 'done' : ''}`}>
                  <div className="course-top">
                    <span className="muted">
                      {c.level} · {c.minutes} min
                    </span>
                    {done ? <Status kind="good">Passed</Status> : <Pts n={c.points} sign />}
                  </div>
                  <h3>
                    {c.title}
                    <span className="zh">{c.zh}</span>
                  </h3>
                  <p className="muted">{c.lessons[0]}</p>
                  {c.id === 'promptsafety' && !done && (
                    <p className="unlock">
                      <Icon name="lock" size={14} /> Unlocks DeepSeek and Qwen API credits
                    </p>
                  )}
                  <button className={`btn ${done ? 'ghost' : 'primary'}`} onClick={() => setOpen(c.id)}>
                    {done ? 'Review' : 'Start course'}
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
