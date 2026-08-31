import { computeReadability, computeSeoChecks } from '@/lib/content-score/score';

interface ContentScorePanelProps {
  title: string;
  description: string;
  content: string;
  focusKeyword: string;
  featuredImageAlt: string;
  internalLinkCount: number;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-corner-success' : score >= 50 ? 'text-corner-gold' : 'text-corner-danger';
  return <span className={`font-display text-3xl font-semibold ${color}`}>{score}</span>;
}

/** Live, fully deterministic content-quality feedback — no AI call, recomputed on every keystroke from the same content already in the editor. */
export function ContentScorePanel(props: ContentScorePanelProps) {
  const readability = computeReadability(props.content);
  const seo = computeSeoChecks(props);

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Content score</h2>

      <div className="mt-3 flex items-center gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-corner-muted">SEO score</p>
          <ScoreBadge score={seo.score} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-corner-muted">Readability</p>
          <p className="font-display text-lg font-semibold text-corner-charcoal">{readability.label}</p>
          <p className="text-xs text-corner-muted">
            {readability.wordCount} words · {readability.sentenceCount} sentences
          </p>
        </div>
      </div>

      {seo.warnings.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-corner-muted">Suggested improvements</p>
          <ul className="mt-2 space-y-1.5 text-sm text-corner-charcoal">
            {seo.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <span aria-hidden className="text-corner-gold">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {seo.passed.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-corner-muted">
            {seo.passed.length} check{seo.passed.length === 1 ? '' : 's'} passed
          </summary>
          <ul className="mt-2 space-y-1.5 text-corner-muted">
            {seo.passed.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden className="text-corner-success">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
