import type { DailyContent, DailyEntry } from '../lib/api';

interface MasterCardProps {
  entry: DailyEntry;
  locale: string;
  title: string;
}

export function MasterCard({ entry, locale, title }: MasterCardProps) {
  const content: DailyContent | undefined =
    entry.content[locale] ?? entry.content['zh-TW'] ?? entry.content.en;
  if (!content) return null;

  return (
    <section className="card master-card">
      <div className="card-head">
        <h2>{title}</h2>
        <span className="muted small">{entry.date}</span>
      </div>
      {content.headline ? <p className="master-headline">{content.headline}</p> : null}
      {content.colors.length > 0 ? (
        <div className="chip-row master-colors">
          {content.colors.map((color) => (
            <span className="master-color" key={color}>
              {color}
            </span>
          ))}
        </div>
      ) : null}
      {content.summary ? <p className="master-summary">{content.summary}</p> : null}
      {content.note ? <p className="muted small">{content.note}</p> : null}
    </section>
  );
}
