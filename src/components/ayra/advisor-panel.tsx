"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Bot, X } from "lucide-react";

import { Chip } from "@/components/ayra/ui";
import type {
  AdvisorAnswer,
  AdvisorConversationTurn,
  AdvisorRouteContext,
} from "@/lib/ayra/advisor";

type AdvisorApiResponse = AdvisorAnswer & {
  mode: "deterministic-fallback" | "gemini";
};

type AdvisorPanelProps = AdvisorRouteContext & {
  className?: string;
};

const quickQuestions = [
  "How much has been paid?",
  "How do I watch the transaction hash?",
  "Which public proof is available here?",
  "What is the public approval list?",
] as const;

function advisorModeLabel(mode: AdvisorApiResponse["mode"]) {
  return mode === "gemini" ? "Conversational" : "Public records";
}

export function AdvisorPanel({ className, initiativeSlug, trackSlug }: AdvisorPanelProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AdvisorConversationTurn[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [response, setResponse] = useState<AdvisorApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const route = useMemo(
    () => ({
      trackSlug,
      initiativeSlug,
    }),
    [initiativeSlug, trackSlug],
  );

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  const submitQuestion = useCallback(
    async (nextQuestion: string) => {
      const trimmed = nextQuestion.trim();
      if (!trimmed || pendingQuestion) return;

      setOpen(true);
      setPendingQuestion(trimmed);
      setError(null);

      const nextHistory: AdvisorConversationTurn[] = [
        ...history.slice(-5),
        { role: "user", text: trimmed },
      ];

      try {
        const response = await fetch("/api/advisor", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            question: trimmed,
            route,
            history: history.slice(-5),
          }),
        });

        const body = (await response.json()) as Partial<AdvisorApiResponse> & {
          error?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(body.error?.message || "Advisor request failed.");
        }

        setResponse(body as AdvisorApiResponse);
        setHistory([...nextHistory, { role: "advisor", text: body.answer ?? "" }]);
        setQuestion("");
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "The advisor could not answer that question.",
        );
      } finally {
        setPendingQuestion(null);
      }
    },
    [history, pendingQuestion, route],
  );

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () => {
      if (!dialog) return [];
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not([disabled])",
            "textarea:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ),
      ).filter((element) => element.offsetParent !== null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => {
      getFocusable()[0]?.focus();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [dismiss, open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`advisor-launcher ${className ?? ""}`.trim()}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Bot className="h-4 w-4" />
        <span>Ask AYRA</span>
      </button>

      {open && mounted
        ? createPortal(
            <div className="advisor-scrim" onClick={dismiss} role="presentation">
              <div
                aria-describedby="advisor-body"
                aria-labelledby="advisor-title"
                aria-modal="true"
                className="advisor-panel"
                ref={dialogRef}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                tabIndex={-1}
              >
                <button
                  aria-label="Close advisor"
                  className="advisor-close"
                  onClick={dismiss}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="advisor-kicker">Public advisor</div>
                <h2 className="advisor-title" id="advisor-title">
                  Ask AYRA
                </h2>
                <div className="advisor-divider" />

                <div className="advisor-quick-actions" aria-label="Suggested questions">
                  {quickQuestions.map((prompt) => (
                    <button
                      className="advisor-quick-action"
                      disabled={Boolean(pendingQuestion)}
                      key={prompt}
                      onClick={() => void submitQuestion(prompt)}
                      type="button"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <p className="advisor-note" id="advisor-body">
                  Public records only: I answer from approved project updates,
                  public proof packs, funding summaries, and Stellar trace
                  language. I cannot access private contacts, raw receipt files,
                  failed payments, or internal notes.
                </p>

                <div className="advisor-transcript" aria-live="polite">
                  {history.length === 0 ? (
                    <div className="advisor-empty">
                      Ask a question or choose one of the public prompts above.
                    </div>
                  ) : (
                    history.map((turn, index) => (
                      <div
                        className={`advisor-turn ${turn.role === "advisor" ? "advisor-turn-response" : "advisor-turn-question"}`}
                        key={`${turn.role}-${index}-${turn.text.slice(0, 20)}`}
                      >
                        <div className="mono advisor-turn-role">
                          {turn.role === "advisor" ? "AYRA" : "You"}
                        </div>
                        <p>{turn.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {response ? (
                  <div className="advisor-answer-shell">
                    <div className="advisor-answer-header">
                      <Chip tone={response.status === "answered" ? "ok" : "warn"}>
                        {response.status === "answered"
                          ? "Answered"
                          : "Grounded decline"}
                      </Chip>
                      <span className="advisor-mode">
                        {advisorModeLabel(response.mode)}
                      </span>
                    </div>
                    <p className="advisor-answer">{response.answer}</p>
                    <div className="advisor-citations" aria-label="Citations">
                      {response.citations.map((citation) =>
                        citation.href ? (
                          <a
                            className="advisor-citation"
                            href={citation.href}
                            key={citation.sourceId}
                          >
                            {citation.label}
                          </a>
                        ) : (
                          <span className="advisor-citation" key={citation.sourceId}>
                            {citation.label}
                          </span>
                        ),
                      )}
                    </div>
                    <div className="advisor-followups" aria-label="Suggested follow-up questions">
                      {response.followups.map((followup) => (
                        <button
                          className="advisor-followup"
                          disabled={Boolean(pendingQuestion)}
                          key={followup}
                          onClick={() => void submitQuestion(followup)}
                          type="button"
                        >
                          {followup}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="advisor-error" role="alert">
                    {error}
                  </div>
                ) : null}

                <form
                  className="advisor-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitQuestion(question);
                  }}
                >
                  <label className="sr-only" htmlFor="advisor-question">
                    Ask about public proof
                  </label>
                  <input
                    id="advisor-question"
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask about public proof..."
                    type="text"
                    value={question}
                  />
                  <button
                    aria-label="Send question"
                    className="advisor-submit"
                    disabled={!question.trim() || Boolean(pendingQuestion)}
                    type="submit"
                  >
                    {pendingQuestion ? (
                      <span className="mono text-xs uppercase tracking-[0.18em]">
                        ...
                      </span>
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
