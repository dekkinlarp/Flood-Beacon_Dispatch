import type { ReactNode } from 'react';
import type { BoardSummary } from '../logic/summary';

const clockFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', weekday: 'short', day: '2-digit', month: 'short' });

interface Props {
  summary: BoardSummary;
  now: Date;
  mode: 'live' | 'demo';
  /** Demo controls (or the "start demo" button) on the right. */
  children?: ReactNode;
}

/** Header strip: brand, live counters, clock, demo controls. */
export function TopBar({ summary, now, mode, children }: Props) {
  const stats: { label: string; value: string; tone?: 'danger' | 'warn' }[] = [
    { label: 'Open', value: String(summary.open) },
    { label: 'Critical', value: String(summary.critical), tone: summary.critical ? 'danger' : undefined },
    { label: 'Waiting', value: String(summary.waiting), tone: summary.waiting ? 'warn' : undefined },
    { label: 'No team >30m', value: String(summary.overdueCritical), tone: summary.overdueCritical ? 'danger' : undefined },
    { label: 'Teams free', value: `${summary.teamsAvailable}/${summary.teamsOnDuty}` },
  ];
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden="true" />
        <span>
          <strong>FLOOD DISPATCH</strong>
          <small>Bangkok · 50 districts</small>
        </span>
      </div>
      <dl className="topbar__stats">
        {stats.map((s) => (
          <div key={s.label} className={s.tone ? `stat stat--${s.tone}` : 'stat'}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="topbar__clock">
        <span className={`mode mode--${mode}`}>{mode}</span>
        <time dateTime={now.toISOString()}>
          <strong>{clockFormat.format(now)}</strong>
          <small>{dateFormat.format(now)} · ICT</small>
        </time>
      </div>
      <div className="topbar__demo">{children}</div>
    </header>
  );
}
