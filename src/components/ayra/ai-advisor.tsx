"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, X } from "lucide-react";

type AdvisorCitation = {
  sourceId?: string;
  label: string;
  href?: string;
};

type AdvisorResponse = {
  answer?: string;
  citations?: AdvisorCitation[];
  followups?: string[];
  mode?: string;
  error?: {
    message?: string;
  };
};

type AdvisorMessage = {
  id: string;
  role: "advisor" | "user";
  text: string;
  citations?: AdvisorCitation[];
  mode?: string;
};

type AiAdvisorProps = {
  trackSlug?: string;
  initiativeSlug?: string;
};

const homeSuggestions = [
  "What public records can you answer from?",
  "Which project should I inspect first?",
  "What does AYRA keep private?",
] as const;

const projectSuggestions = [
  "How much has been paid?",
  "How do I watch the transaction hash?",
  "Which public proof is available here?",
] as const;

function makeMessageId() {
  return `advisor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AiAdvisor({ trackSlug, initiativeSlug }: AiAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      id: "advisor-initial",
      role: "advisor",
      text: "Public records only: I answer from approved project updates, public proof packs, funding summaries, and Stellar trace language. I cannot access private contacts, raw receipt files, failed payments, or internal notes.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => (initiativeSlug ? projectSuggestions : homeSuggestions),
    [initiativeSlug],
  );

  const submitQuestion = async (nextQuestion: string) => {
    const trimmedQuestion = nextQuestion.trim();
    if (trimmedQuestion.length < 3 || isLoading) return;

    setError(null);
    setQuestion("");
    setMessages((current) => [
      ...current,
      {
        id: makeMessageId(),
        role: "user",
        text: trimmedQuestion,
      },
    ]);
    setIsOpen(true);
    setIsLoading(true);

    try {
      const response = await fetch("/api/advisor", {
        body: JSON.stringify({
          question: trimmedQuestion,
          route: {
            ...(trackSlug ? { trackSlug } : {}),
            ...(initiativeSlug ? { initiativeSlug } : {}),
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as AdvisorResponse;

      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "AYRA advisor could not answer right now.",
        );
      }

      setMessages((current) => [
        ...current,
        {
          citations: payload.citations ?? [],
          id: makeMessageId(),
          mode: payload.mode,
          role: "advisor",
          text:
            payload.answer ??
            "I could not verify an answer against AYRA public records.",
        },
      ]);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "AYRA advisor could not answer right now.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: makeMessageId(),
          role: "advisor",
          text: message,
        },
      ]);
    } finally {
      setIsLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitQuestion(question);
  };

  return (
    <div className="ai-advisor" data-open={isOpen ? "true" : "false"}>
      <button
        aria-controls="ayra-ai-advisor-panel"
        aria-expanded={isOpen}
        className="ai-advisor-launcher"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Bot className="h-4 w-4" />
        <span>Ask AYRA</span>
      </button>

      {isOpen ? (
        <aside
          aria-label="AYRA AI advisor panel"
          className="ai-advisor-panel"
          id="ayra-ai-advisor-panel"
        >
          <div className="ai-advisor-head">
            <div>
              <span className="ai-advisor-kicker">Public advisor</span>
              <h2>Ask AYRA</h2>
            </div>
            <button
              aria-label="Close AYRA AI advisor"
              className="ai-advisor-close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="ai-advisor-suggestions" aria-label="Suggested prompts">
            {suggestions.map((suggestion) => (
              <button
                className="ai-advisor-suggestion"
                disabled={isLoading}
                key={suggestion}
                onClick={() => void submitQuestion(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div
            aria-live="polite"
            className="ai-advisor-messages"
            role="log"
          >
            {messages.map((message) => (
              <article
                className={`ai-advisor-message ${message.role}`}
                key={message.id}
              >
                <p>{message.text}</p>
                {message.citations && message.citations.length > 0 ? (
                  <div className="ai-advisor-citations" aria-label="Citations">
                    {message.citations.map((citation, index) =>
                      citation.href ? (
                        <Link
                          className="ai-advisor-citation"
                          href={citation.href}
                          key={`${citation.sourceId ?? citation.label}-${index}`}
                        >
                          {citation.label}
                        </Link>
                      ) : (
                        <span
                          className="ai-advisor-citation"
                          key={`${citation.sourceId ?? citation.label}-${index}`}
                        >
                          {citation.label}
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
                {message.mode ? (
                  <span className="ai-advisor-mode">{message.mode}</span>
                ) : null}
              </article>
            ))}
            {isLoading ? (
              <div className="ai-advisor-status">Reading public records...</div>
            ) : null}
          </div>

          {error ? (
            <p className="ai-advisor-error" role="status">
              {error}
            </p>
          ) : null}

          <form className="ai-advisor-form" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="ayra-ai-advisor-question">
              Ask AYRA a public-record question
            </label>
            <input
              autoComplete="off"
              disabled={isLoading}
              id="ayra-ai-advisor-question"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about public proof..."
              ref={inputRef}
              type="text"
              value={question}
            />
            <button
              aria-label="Send question to AYRA advisor"
              disabled={isLoading || question.trim().length < 3}
              type="submit"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
