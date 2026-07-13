'use client';

import type { ReactNode } from 'react';
import { decodeHtmlEntities } from '@nexiora/shared';

type AnswerContentProps = {
  markdown: string;
  className?: string;
};

function inlineFormat(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const safe = decodeHtmlEntities(text);

  while ((match = pattern.exec(safe)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={`t-${key++}`}>{safe.slice(last, match.index)}</span>);
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`b-${key++}`} className="font-semibold text-nx-ink">
          {decodeHtmlEntities(token.slice(2, -2))}
        </strong>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`c-${key++}`}
          className="rounded bg-nx-border/40 px-1 py-0.5 font-body text-[0.9em] text-nx-ink"
        >
          {decodeHtmlEntities(token.slice(1, -1))}
        </code>,
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        nodes.push(
          <a
            key={`a-${key++}`}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-nx-accent underline-offset-2 hover:underline"
          >
            {decodeHtmlEntities(link[1])}
          </a>,
        );
      }
    }
    last = match.index + token.length;
  }

  if (last < safe.length) {
    nodes.push(<span key={`t-${key++}`}>{safe.slice(last)}</span>);
  }
  return nodes;
}

/**
 * Lightweight readable renderer for Nova Search answers (headings, lists, quotes, links).
 */
export function AnswerContent({ markdown, className = '' }: AnswerContentProps) {
  const decodedLines = markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => decodeHtmlEntities(line));
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-4 list-disc space-y-2.5 pl-5 text-[15px] leading-7 text-nx-ink">
        {listItems.map((item, index) => (
          <li key={`li-${index}`}>{inlineFormat(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const raw of decodedLines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushList();
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className="my-4 rounded-nx border-l-2 border-nx-accent bg-nx-accent-soft/30 px-4 py-3 text-sm leading-relaxed text-nx-muted"
        >
          {inlineFormat(trimmed.slice(2))}
        </blockquote>,
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2 key={`h2-${key++}`} className="mb-3 mt-2 font-display text-xl font-semibold text-nx-ink">
          {decodeHtmlEntities(trimmed.slice(3))}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      blocks.push(
        <h3 key={`h3-${key++}`} className="mb-2 mt-6 font-display text-lg font-semibold text-nx-ink">
          {decodeHtmlEntities(trimmed.slice(4))}
        </h3>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ''));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''));
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${key++}`} className="my-3 text-[15px] leading-7 text-nx-ink">
        {inlineFormat(trimmed)}
      </p>,
    );
  }

  flushList();

  return <div className={`answer-prose ${className}`}>{blocks}</div>;
}
