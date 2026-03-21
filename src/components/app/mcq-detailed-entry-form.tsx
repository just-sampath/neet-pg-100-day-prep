"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import {
  MCQ_CAUSE_CODE_OPTIONS,
  MCQ_FIX_CODE_OPTIONS,
  MCQ_PRIORITY_OPTIONS,
  MCQ_RESULT_OPTIONS,
  MCQ_TAG_OPTIONS,
} from "@/lib/domain/mcq";
import type { McqFixCode, McqPriority, McqResult, McqTag } from "@/lib/domain/types";
import { submitMcqItemAction } from "@/lib/server/actions";

const DETAILS_STORAGE_KEY = "beside-you:mcq-details-open";
const detailStateListeners = new Set<() => void>();

function subscribeToDetailState(listener: () => void) {
  detailStateListeners.add(listener);
  return () => {
    detailStateListeners.delete(listener);
  };
}

function getDetailStateSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(DETAILS_STORAGE_KEY) === "open";
}

function getDetailStateServerSnapshot() {
  return false;
}

function setStoredDetailState(nextOpen: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(DETAILS_STORAGE_KEY, nextOpen ? "open" : "closed");
  for (const listener of detailStateListeners) {
    listener();
  }
}

type Props = {
  todayDate: string;
  subjects: string[];
  recentTopics: string[];
  recentSources: string[];
};

export function McqDetailedEntryForm({ todayDate, subjects, recentTopics, recentSources }: Props) {
  const [pending, startTransition] = useTransition();
  const detailsOpen = useSyncExternalStore(subscribeToDetailState, getDetailStateSnapshot, getDetailStateServerSnapshot);
  const [entryDate, setEntryDate] = useState(todayDate);
  const [mcqId, setMcqId] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [causeCode, setCauseCode] = useState("");
  const [priority, setPriority] = useState<McqPriority | "">("");
  const [correctRule, setCorrectRule] = useState("");
  const [whatFooledMe, setWhatFooledMe] = useState("");
  const [fixCodes, setFixCodes] = useState<McqFixCode[]>([]);
  const [tags, setTags] = useState<McqTag[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "neutral" | "red"; message: string } | null>(null);

  const recentSourcePills = useMemo(() => recentSources.slice(0, 4), [recentSources]);

  function toggleFixCode(value: McqFixCode) {
    setFixCodes((current) => (current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]));
  }

  function toggleTag(value: McqTag) {
    setTags((current) => (current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]));
  }

  function resetAfterSave() {
    setEntryDate(todayDate);
    setMcqId("");
    setTopic("");
    setCauseCode("");
    setPriority("");
    setCorrectRule("");
    setWhatFooledMe("");
    setFixCodes([]);
    setTags([]);
  }

  function submit(result: McqResult) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("entryDate", entryDate);
      formData.set("mcqId", mcqId);
      formData.set("result", result);
      formData.set("subject", subject);
      formData.set("topic", topic);
      formData.set("source", source);
      formData.set("causeCode", causeCode);
      formData.set("priority", priority);
      formData.set("correctRule", correctRule);
      formData.set("whatFooledMe", whatFooledMe);
      for (const code of fixCodes) {
        formData.append("fixCodes", code);
      }
      for (const tag of tags) {
        formData.append("tags", tag);
      }

      const outcome = await submitMcqItemAction(formData);
      if (!outcome.ok) {
        setFeedback({ tone: "red", message: outcome.error ?? "Could not save the MCQ entry." });
        return;
      }

      resetAfterSave();
      setFeedback({ tone: "neutral", message: `${mcqId} saved as ${MCQ_RESULT_OPTIONS.find((item) => item.value === result)?.label}.` });
    });
  }

  return (
    <div className="mt-4 grid gap-4">
      <label>
        <span className="mb-2 block text-sm text-[var(--muted)]">MCQ ID</span>
        <input
          autoFocus
          className="field"
          placeholder="e.g. GT-07-Q118"
          value={mcqId}
          onChange={(event) => setMcqId(event.target.value)}
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        {MCQ_RESULT_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
              option.value === "wrong"
                ? "border-[rgba(227,140,140,0.25)] bg-[rgba(227,140,140,0.08)]"
                : option.value === "guessed_right"
                  ? "border-[rgba(243,209,123,0.24)] bg-[rgba(243,209,123,0.08)]"
                  : "border-[rgba(142,217,165,0.24)] bg-[rgba(142,217,165,0.08)]"
            }`}
            disabled={pending || !mcqId.trim()}
            type="button"
            onClick={() => submit(option.value)}
          >
            <div className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[var(--muted)] md:text-[0.72rem]">Tap to save</div>
            <div className="mt-2 text-base font-semibold md:text-lg">{option.label}</div>
          </button>
        ))}
      </div>

      <div className="note-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Add details</div>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              Optional notes for patterns, weak spots, and fixes. This expander remembers its last state during the session.
            </p>
          </div>
          <button
            aria-controls="mcq-details-panel"
            aria-expanded={detailsOpen}
            className="button-secondary"
            type="button"
            onClick={() => setStoredDetailState(!detailsOpen)}
          >
            {detailsOpen ? "Hide details" : "Add details"}
          </button>
        </div>

        {detailsOpen ? (
          <div className="mt-4 grid gap-4" id="mcq-details-panel">
            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Entry date</span>
                <input className="field" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Subject</span>
                <select className="field" value={subject} onChange={(event) => setSubject(event.target.value)}>
                  <option value="">Not tagging subject</option>
                  {subjects.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-1">
                <span className="mb-2 block text-sm text-[var(--muted)]">Cause code</span>
                <select className="field" value={causeCode} onChange={(event) => setCauseCode(event.target.value)}>
                  <option value="">No cause code</option>
                  {MCQ_CAUSE_CODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} · {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Topic</span>
                <input
                  className="field"
                  list="mcq-topic-suggestions"
                  placeholder="Free text, with recent suggestions"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                />
                <datalist id="mcq-topic-suggestions">
                  {recentTopics.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Source</span>
                <input
                  className="field"
                  list="mcq-source-suggestions"
                  placeholder="GT-07 / Module-Pharma-ANS / CM-PSM-01"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                />
                <datalist id="mcq-source-suggestions">
                  {recentSources.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>
            </div>

            {recentSourcePills.length ? (
              <div className="flex flex-wrap gap-2">
                {recentSourcePills.map((option) => (
                  <button key={option} className="button-secondary" type="button" onClick={() => setSource(option)}>
                    {option}
                  </button>
                ))}
              </div>
            ) : null}

            <div>
              <div className="mb-2 block text-sm text-[var(--muted)]">Priority</div>
              <div className="grid gap-3 md:grid-cols-3">
                {MCQ_PRIORITY_OPTIONS.map((option) => {
                  const active = priority === option.value;
                  return (
                    <button
                      key={option.value}
                      className={`rounded-[1.1rem] border px-4 py-3 text-left ${
                        active ? "border-[var(--border-strong)] bg-[var(--accent-faint)]" : "border-[var(--border)] bg-[var(--surface-muted)]"
                      }`}
                      type="button"
                      onClick={() => setPriority((current) => (current === option.value ? "" : option.value))}
                    >
                      <div className="font-semibold">{option.value}</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">{option.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 block text-sm text-[var(--muted)]">Fix codes</div>
              <div className="flex flex-wrap gap-2">
                {MCQ_FIX_CODE_OPTIONS.map((option) => {
                  const active = fixCodes.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      className={`rounded-full border px-3 py-2 text-sm ${
                        active ? "border-[var(--border-strong)] bg-[var(--accent-faint)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                      }`}
                      type="button"
                      onClick={() => toggleFixCode(option.value)}
                    >
                      {option.value} · {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 block text-sm text-[var(--muted)]">Tags</div>
              <div className="flex flex-wrap gap-2">
                {MCQ_TAG_OPTIONS.map((option) => {
                  const active = tags.includes(option);
                  return (
                    <button
                      key={option}
                      className={`rounded-full border px-3 py-2 text-sm capitalize ${
                        active ? "border-[var(--border-strong)] bg-[var(--accent-faint)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                      }`}
                      type="button"
                      onClick={() => toggleTag(option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Correct rule</span>
                <textarea
                  className="field min-h-28"
                  placeholder="1-2 lines: what should have been remembered or applied"
                  value={correctRule}
                  onChange={(event) => setCorrectRule(event.target.value)}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">What fooled me</span>
                <textarea
                  className="field min-h-28"
                  placeholder="Missed clue / why the trap worked"
                  value={whatFooledMe}
                  onChange={(event) => setWhatFooledMe(event.target.value)}
                />
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {feedback ? (
        <p
          aria-live="polite"
          className={`text-sm ${feedback.tone === "red" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
