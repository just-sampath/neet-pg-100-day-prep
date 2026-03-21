"use client";

import { useState, useTransition } from "react";

import { submitMcqBulkAction } from "@/lib/server/actions";

type Props = {
  todayDate: string;
  subjects: string[];
  recentSources: string[];
};

export function McqBulkEntryForm({ todayDate, subjects, recentSources }: Props) {
  const [pending, startTransition] = useTransition();
  const [entryDate, setEntryDate] = useState(todayDate);
  const [totalAttempted, setTotalAttempted] = useState("");
  const [correct, setCorrect] = useState("");
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "neutral" | "red"; message: string } | null>(null);
  const attemptedNumber = totalAttempted.trim() ? Number(totalAttempted) : null;
  const correctNumber = correct.trim() ? Number(correct) : null;
  const computedWrong =
    attemptedNumber !== null &&
      correctNumber !== null &&
      Number.isInteger(attemptedNumber) &&
      Number.isInteger(correctNumber) &&
      attemptedNumber >= 0 &&
      correctNumber >= 0 &&
      correctNumber <= attemptedNumber
      ? String(attemptedNumber - correctNumber)
      : "";
  const submitDisabled = pending || !computedWrong || attemptedNumber === null || attemptedNumber <= 0;

  function submit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("entryDate", entryDate);
      formData.set("totalAttempted", totalAttempted);
      formData.set("correct", correct);
      formData.set("wrong", computedWrong);
      formData.set("subject", subject);
      formData.set("source", source);

      const result = await submitMcqBulkAction(formData);
      if (!result.ok) {
        setFeedback({ tone: "red", message: result.error ?? "Could not save the bulk entry." });
        return;
      }

      setTotalAttempted("");
      setCorrect("");
      setFeedback({ tone: "neutral", message: "Bulk MCQ entry saved." });
    });
  }

  return (
    <form
      className="mt-4 grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <label>
          <span className="mb-2 block text-sm text-[var(--muted)]">Entry date</span>
          <input className="field" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
        </label>
        <label>
          <span className="mb-2 block text-sm text-[var(--muted)]">Subject</span>
          <select className="field" value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="">Mixed / not tagging</option>
            {subjects.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-2 block text-sm text-[var(--muted)]">Total attempted</span>
          <input
            className="field"
            inputMode="numeric"
            min="0"
            type="number"
            value={totalAttempted}
            onChange={(event) => setTotalAttempted(event.target.value)}
            required
          />
        </label>
        <label>
          <span className="mb-2 block text-sm text-[var(--muted)]">Correct</span>
          <input
            className="field"
            inputMode="numeric"
            min="0"
            type="number"
            value={correct}
            onChange={(event) => setCorrect(event.target.value)}
            required
          />
        </label>
        <label>
          <span className="mb-2 block text-sm text-[var(--muted)]">Wrong</span>
          <input
            className="field"
            inputMode="numeric"
            type="number"
            value={computedWrong}
            readOnly
            tabIndex={-1}
          />
        </label>
      </div>

      <label>
        <span className="mb-2 block text-sm text-[var(--muted)]">Source</span>
        <input
          className="field"
          list="mcq-bulk-source-suggestions"
          name="source"
          placeholder="CM-PSM-01 / Module-Pharma-ANS"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
        <datalist id="mcq-bulk-source-suggestions">
          {recentSources.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm leading-7 text-(--text-secondary)">
            Keep this fast: date, attempted, correct, wrong. Subject and source are there when the batch needs context.
          </p>
          {totalAttempted && correct && !computedWrong ? (
            <p className="text-sm text-[var(--danger)]">Correct cannot exceed attempted, and both values must be whole numbers.</p>
          ) : null}
        </div>
        <button className="button-primary" disabled={submitDisabled} type="submit">
          Save bulk entry
        </button>
      </div>

      {feedback ? (
        <p
          aria-live="polite"
          className={`text-sm ${feedback.tone === "red" ? "text-[var(--danger)]" : "text-(--text-secondary)"}`}
        >
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
