import { Fragment, type ReactNode } from "react";

const WEB_URL = /https?:\/\/[^\s<>]+/giu;
const TRAILING_PUNCTUATION = /[),.;!?]+$/u;

function linkedLine(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(WEB_URL)) {
    const start = match.index ?? 0;
    const rawUrl = match[0];
    const trailing = rawUrl.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

    if (start > cursor) nodes.push(line.slice(cursor, start));
    nodes.push(
      <a
        className="public-rich-link"
        href={url}
        key={`${start}-${url}`}
        rel="noreferrer noopener"
        target="_blank"
      >
        {url}
      </a>,
    );
    if (trailing) nodes.push(trailing);
    cursor = start + rawUrl.length;
  }

  if (cursor < line.length) nodes.push(line.slice(cursor));
  return nodes;
}

function paragraphContent(paragraph: string) {
  return paragraph.split("\n").map((line, index) => (
    <Fragment key={`${index}-${line.slice(0, 24)}`}>
      {index > 0 ? <br /> : null}
      {linkedLine(line)}
    </Fragment>
  ));
}

export function PublicRichText({ children }: { children: string }) {
  const paragraphs = children
    .trim()
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="public-rich-text">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 32)}`}>
          {paragraphContent(paragraph)}
        </p>
      ))}
    </div>
  );
}
