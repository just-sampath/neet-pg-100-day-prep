"use client";

import { type KeyboardEvent, useState, useTransition } from "react";

import {
  GT_DEVICE_OPTIONS,
  GT_FEELING_OPTIONS,
  GT_SECTION_KEYS,
  GT_TIME_LOST_OPTIONS,
  type GtScheduleContextItem,
  type GtSectionKey,
} from "@/lib/domain/gt";
import type { GtDevice, GtOverallFeeling, GtTimeLostCode } from "@/lib/domain/types";
import { submitGtAction } from "@/lib/server/actions";

type Props = {
  todayDate: string;
  subjectOptions: string[];
  suggestedPlanItem: GtScheduleContextItem | null;
};

type SectionState = {
  timeEnough: "" | "yes" | "no";
  panicStarted: "" | "yes" | "no";
  guessedTooMuch: "" | "yes" | "no";
  timeLostOn: GtTimeLostCode[];
};

const SECTION_BINARY_QUESTIONS: Array<{
  field: "timeEnough" | "panicStarted" | "guessedTooMuch";
  label: string;
}> = [
  { field: "timeEnough", label: "Time felt enough?" },
  { field: "panicStarted", label: "Panic started?" },
  { field: "guessedTooMuch", label: "Guessed too much?" },
];

const MAX_RECURRING_TOPICS = 3;
const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

function createEmptySection(): SectionState {
  return {
    timeEnough: "",
    panicStarted: "",
    guessedTooMuch: "",
    timeLostOn: [],
  };
}

function initialGtNumber(suggestedPlanItem: GtScheduleContextItem | null) {
  return suggestedPlanItem?.label ?? "";
}

function initialDayNumber(suggestedPlanItem: GtScheduleContextItem | null) {
  return suggestedPlanItem ? String(suggestedPlanItem.dayNumber) : "";
}

export function GtEntryForm({ todayDate, subjectOptions, suggestedPlanItem }: Props) {
  const [pending, startTransition] = useTransition();
  const [gtNumber, setGtNumber] = useState(initialGtNumber(suggestedPlanItem));
  const [gtDate, setGtDate] = useState(todayDate);
  const [dayNumber, setDayNumber] = useState(initialDayNumber(suggestedPlanItem));
  const [score, setScore] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [unattempted, setUnattempted] = useState("");
  const [airPercentile, setAirPercentile] = useState("");
  const [device, setDevice] = useState<GtDevice | "">("");
  const [attemptedLive, setAttemptedLive] = useState<"" | "yes" | "no">("");
  const [overallFeeling, setOverallFeeling] = useState<GtOverallFeeling | "">("");
  const [sections, setSections] = useState<Record<GtSectionKey, SectionState>>({
    A: createEmptySection(),
    B: createEmptySection(),
    C: createEmptySection(),
    D: createEmptySection(),
    E: createEmptySection(),
  });
  const [errorTypes, setErrorTypes] = useState("");
  const [recurringTopicsInput, setRecurringTopicsInput] = useState("");
  const [recurringTopics, setRecurringTopics] = useState<string[]>([]);
  const [weakestSubjects, setWeakestSubjects] = useState<string[]>([]);
  const [knowledgeVsBehaviour, setKnowledgeVsBehaviour] = useState("50");
  const [knowledgeVsBehaviourTouched, setKnowledgeVsBehaviourTouched] = useState(false);
  const [unsureRightCount, setUnsureRightCount] = useState("");
  const [changeBeforeNextGt, setChangeBeforeNextGt] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "neutral" | "red"; message: string } | null>(null);

  function updateSection(sectionKey: GtSectionKey, updater: (section: SectionState) => SectionState) {
    setSections((current) => ({
      ...current,
      [sectionKey]: updater(current[sectionKey]),
    }));
  }

  function toggleTimeLost(sectionKey: GtSectionKey, value: GtTimeLostCode) {
    updateSection(sectionKey, (section) => ({
      ...section,
      timeLostOn: section.timeLostOn.includes(value)
        ? section.timeLostOn.filter((entry) => entry !== value)
        : [...section.timeLostOn, value],
    }));
  }

  function addRecurringTopic() {
    const trimmed = recurringTopicsInput.trim().replace(/\s+/gu, " ");
    if (!trimmed) {
      return;
    }
    if (recurringTopics.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
      setRecurringTopicsInput("");
      return;
    }
    if (recurringTopics.length >= MAX_RECURRING_TOPICS) {
      setFeedback({ tone: "red", message: "Keep the wrapper to the top 3 recurring topics." });
      setRecurringTopicsInput("");
      return;
    }
    setRecurringTopics((current) => [...current, trimmed]);
    setFeedback(null);
    setRecurringTopicsInput("");
  }

  function removeRecurringTopic(topic: string) {
    setRecurringTopics((current) => current.filter((entry) => entry !== topic));
  }

  function toggleWeakestSubject(subject: string) {
    setWeakestSubjects((current) => (current.includes(subject) ? current.filter((entry) => entry !== subject) : [...current, subject]));
  }

  function onRecurringTopicKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addRecurringTopic();
    }
  }

  function resetForm() {
    setGtNumber(initialGtNumber(suggestedPlanItem));
    setGtDate(todayDate);
    setDayNumber(initialDayNumber(suggestedPlanItem));
    setScore("");
    setCorrect("");
    setWrong("");
    setUnattempted("");
    setAirPercentile("");
    setDevice("");
    setAttemptedLive("");
    setOverallFeeling("");
    setSections({
      A: createEmptySection(),
      B: createEmptySection(),
      C: createEmptySection(),
      D: createEmptySection(),
      E: createEmptySection(),
    });
    setErrorTypes("");
    setRecurringTopicsInput("");
    setRecurringTopics([]);
    setWeakestSubjects([]);
    setKnowledgeVsBehaviour("50");
    setKnowledgeVsBehaviourTouched(false);
    setUnsureRightCount("");
    setChangeBeforeNextGt("");
  }

  function submit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("gtNumber", gtNumber);
      formData.set("gtDate", gtDate);
      formData.set("dayNumber", dayNumber);
      formData.set("score", score);
      formData.set("correct", correct);
      formData.set("wrong", wrong);
      formData.set("unattempted", unattempted);
      formData.set("airPercentile", airPercentile);
      formData.set("device", device);
      formData.set("attemptedLive", attemptedLive);
      formData.set("overallFeeling", overallFeeling);
      formData.set("errorTypes", errorTypes);
      formData.set("recurringTopics", recurringTopics.join(", "));
      formData.set("knowledgeVsBehaviour", knowledgeVsBehaviourTouched ? knowledgeVsBehaviour : "");
      formData.set("unsureRightCount", unsureRightCount);
      formData.set("changeBeforeNextGt", changeBeforeNextGt);

      for (const subject of weakestSubjects) {
        formData.append("weakestSubjects", subject);
      }

      for (const sectionKey of GT_SECTION_KEYS) {
        const section = sections[sectionKey];
        formData.set(`section${sectionKey}TimeEnough`, section.timeEnough);
        formData.set(`section${sectionKey}PanicStarted`, section.panicStarted);
        formData.set(`section${sectionKey}GuessedTooMuch`, section.guessedTooMuch);
        for (const code of section.timeLostOn) {
          formData.append(`section${sectionKey}TimeLostOn`, code);
        }
      }

      const result = await submitGtAction(formData);
      if (!result?.ok) {
        setFeedback({ tone: "red", message: result?.error ?? "Could not save the GT log." });
        return;
      }

      resetForm();
      setFeedback({ tone: "neutral", message: "GT log saved." });
    });
  }

  return (
    <form
      className="mt-4 grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <section className="note-card p-5">
        <div className="eyebrow">Score Section</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">GT number</span>
            <input className="field" value={gtNumber} onChange={(event) => setGtNumber(event.target.value)} required />
          </label>
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">Date</span>
            <input className="field" type="date" value={gtDate} onChange={(event) => setGtDate(event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">Schedule day</span>
            <input className="field" inputMode="numeric" type="number" value={dayNumber} onChange={(event) => setDayNumber(event.target.value)} />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">Score</span>
            <input className="field" inputMode="numeric" type="number" value={score} onChange={(event) => setScore(event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">Correct</span>
            <input className="field" inputMode="numeric" type="number" value={correct} onChange={(event) => setCorrect(event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">Wrong</span>
            <input className="field" inputMode="numeric" type="number" value={wrong} onChange={(event) => setWrong(event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">Unattempted</span>
            <input className="field" inputMode="numeric" type="number" value={unattempted} onChange={(event) => setUnattempted(event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">AIR / Percentile</span>
            <input className="field" value={airPercentile} onChange={(event) => setAirPercentile(event.target.value)} placeholder="e.g. AIR 6.4k / 98.7%" />
          </label>
        </div>
      </section>

      <section className="note-card p-5">
        <div className="eyebrow">Attempt Context</div>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <div>
            <div className="mb-2 text-sm text-[var(--muted)]">Device</div>
            <div className="grid grid-cols-3 gap-3">
              {GT_DEVICE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`rounded-[1.1rem] border px-4 py-3 text-sm ${
                    device === option.value ? "border-[var(--border-strong)] bg-[var(--accent-faint)]" : "border-[var(--border)] bg-[var(--surface-muted)]"
                  }`}
                  type="button"
                  onClick={() => setDevice(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm text-[var(--muted)]">Attempted live</div>
            <div className="grid grid-cols-2 gap-3">
              {YES_NO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`rounded-[1.1rem] border px-4 py-3 text-sm ${
                    attemptedLive === option.value ? "border-[var(--border-strong)] bg-[var(--accent-faint)]" : "border-[var(--border)] bg-[var(--surface-muted)]"
                  }`}
                  type="button"
                  onClick={() => setAttemptedLive(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm text-[var(--muted)]">Overall feeling</div>
            <div className="grid gap-3">
              {GT_FEELING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`rounded-[1.1rem] border px-4 py-3 text-left text-sm ${
                    overallFeeling === option.value ? "border-[var(--border-strong)] bg-[var(--accent-faint)]" : "border-[var(--border)] bg-[var(--surface-muted)]"
                  }`}
                  type="button"
                  onClick={() => setOverallFeeling(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="note-card p-5">
        <div className="eyebrow">Section Breakdown</div>
        <div className="mt-4 grid gap-3">
          {GT_SECTION_KEYS.map((sectionKey) => {
            const section = sections[sectionKey];
            return (
              <details key={sectionKey} className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <summary className="cursor-pointer list-none font-semibold">
                  Section {sectionKey}
                </summary>
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {SECTION_BINARY_QUESTIONS.map((question) => (
                      <div key={question.field}>
                        <div className="mb-2 text-sm text-[var(--muted)]">{question.label}</div>
                        <div className="grid grid-cols-2 gap-3">
                          {YES_NO_OPTIONS.map((option) => {
                            const active = section[question.field] === option.value;
                            return (
                              <button
                                key={option.value}
                                className={`rounded-[1rem] border px-4 py-3 text-sm ${
                                  active ? "border-[var(--border-strong)] bg-[var(--accent-faint)]" : "border-[var(--border)] bg-[var(--surface)]"
                                }`}
                                type="button"
                                onClick={() =>
                                  updateSection(sectionKey, (current) => ({
                                    ...current,
                                    [question.field]: option.value,
                                  }))
                                }
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="mb-2 text-sm text-[var(--muted)]">Time lost on</div>
                    <div className="flex flex-wrap gap-2">
                      {GT_TIME_LOST_OPTIONS.map((option) => {
                        const active = section.timeLostOn.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            className={`rounded-full border px-3 py-2 text-sm ${
                              active ? "border-[var(--border-strong)] bg-[var(--accent-faint)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
                            }`}
                            type="button"
                            onClick={() => toggleTimeLost(sectionKey, option.value)}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="note-card p-5">
        <div className="eyebrow">GT Wrapper</div>
        <div className="mt-4 grid gap-4">
          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">What kinds of errors dominated this GT?</span>
            <textarea className="field min-h-28" value={errorTypes} onChange={(event) => setErrorTypes(event.target.value)} />
          </label>

          <div>
            <div className="mb-2 block text-sm text-[var(--muted)]">Top 3 recurring topics</div>
            <div className="flex gap-3">
              <input
                className="field"
                placeholder="Type a topic and press Enter"
                disabled={recurringTopics.length >= MAX_RECURRING_TOPICS}
                value={recurringTopicsInput}
                onChange={(event) => setRecurringTopicsInput(event.target.value)}
                onKeyDown={onRecurringTopicKeyDown}
              />
              <button className="button-secondary" disabled={recurringTopics.length >= MAX_RECURRING_TOPICS} type="button" onClick={addRecurringTopic}>
                Add
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {recurringTopics.length}/3 kept. Repeated topics matter more than a long list.
            </p>
            {recurringTopics.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {recurringTopics.map((topic) => (
                  <button key={topic} className="button-secondary" type="button" onClick={() => removeRecurringTopic(topic)}>
                    {topic}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-2 block text-sm text-[var(--muted)]">Weakest subjects</div>
            <div className="flex flex-wrap gap-2">
              {subjectOptions.map((subject) => {
                const active = weakestSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    className={`rounded-full border px-3 py-2 text-sm ${
                      active ? "border-[var(--border-strong)] bg-[var(--accent-faint)]" : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                    }`}
                    type="button"
                    onClick={() => toggleWeakestSubject(subject)}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>

          <label>
            <span className="mb-2 block text-sm text-[var(--muted)]">Knowledge vs behaviour split</span>
            <input
              className="w-full accent-[var(--accent)]"
              max="100"
              min="0"
              step="1"
              type="range"
              value={knowledgeVsBehaviour}
              onChange={(event) => {
                setKnowledgeVsBehaviourTouched(true);
                setKnowledgeVsBehaviour(event.target.value);
              }}
            />
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              {knowledgeVsBehaviourTouched
                ? `${knowledgeVsBehaviour}% knowledge / ${100 - Number(knowledgeVsBehaviour || "0")}% behaviour`
                : "Slide only if you want to tag the split for this GT."}
            </div>
          </label>

          <div className="grid gap-4 md:grid-cols-[0.4fr_1.6fr]">
            <label>
              <span className="mb-2 block text-sm text-[var(--muted)]">Unsure-right count</span>
              <input
                className="field"
                inputMode="numeric"
                type="number"
                value={unsureRightCount}
                onChange={(event) => setUnsureRightCount(event.target.value)}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-[var(--muted)]">What will I change before the next GT?</span>
              <textarea
                className="field min-h-28"
                value={changeBeforeNextGt}
                onChange={(event) => setChangeBeforeNextGt(event.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-7 text-[var(--text-secondary)]">
          The structured parts are there to make patterns visible by GT-3 or GT-4, not to turn the wrapper into busywork.
        </p>
        <button className="button-primary" disabled={pending} type="submit">
          Save GT log
        </button>
      </div>

      {feedback ? (
        <p
          aria-live="polite"
          className={`text-sm ${feedback.tone === "red" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}
        >
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
