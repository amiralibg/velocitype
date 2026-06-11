import type { CSSProperties } from 'react';

interface TextDisplayProps {
  text: string;
  typed: string;
  /** Optional per-character style override (used by Ghost Text mode). */
  charStyle?: (index: number) => CSSProperties | undefined;
  className?: string;
}

/**
 * Renders the target text with typing-state highlighting:
 * bright = typed correctly, red = wrong, dim = not yet typed,
 * blinking volt underline = current character.
 */
export default function TextDisplay({ text, typed, charStyle, className = '' }: TextDisplayProps) {
  return (
    <div
      className={`select-none whitespace-pre-wrap font-mono text-2xl leading-relaxed tracking-wide ${className}`}
      aria-hidden
    >
      {text.split('').map((char, i) => {
        let cls = 'text-zinc-600';
        if (i < typed.length) {
          cls = typed[i] === char ? 'text-zinc-50' : 'rounded-sm bg-red-500/15 text-red-400';
        }
        const isCursor = i === typed.length;
        return (
          <span key={i} data-ti={i} className={`${cls} ${isCursor ? 'char-cursor' : ''}`} style={charStyle?.(i)}>
            {char === '\n' ? '⏎\n' : char}
          </span>
        );
      })}
    </div>
  );
}
