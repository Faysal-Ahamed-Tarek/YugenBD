import type { Announcement } from "@/types";

/**
 * Scrolling announcement bar shown under the hero. The messages render twice
 * (one visible group + one aria-hidden duplicate) inside a track that animates
 * by -50%, so the loop is seamless and infinite. Duration scales with the
 * number of messages so more text doesn't scroll uncomfortably fast.
 *
 * The keyframes live in a co-located <style> tag rather than globals.css: the
 * Tailwind v4 / Turbopack CSS pipeline strips hand-written @keyframes from the
 * global sheet, so scoping them here keeps the animation reliable.
 */
export default function AnnouncementMarquee({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;

  const duration = `${Math.max(18, items.length * 12)}s`;

  const group = (ariaHidden: boolean) => (
    <div className="ymq-group" aria-hidden={ariaHidden || undefined}>
      {items.map((a) => (
        <span key={a.id} className="ymq-item">
          <span className="ymq-text">{a.text}</span>
          <span className="ymq-sep" aria-hidden>
            ✦
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <section aria-label="Announcements" className="ymq-bar">
      <style>{marqueeCss}</style>
      {/* Soft fade at both edges so text enters/exits gracefully */}
      <span className="ymq-fade ymq-fade-left" aria-hidden />
      <span className="ymq-fade ymq-fade-right" aria-hidden />
      <div className="ymq-track" style={{ animationDuration: duration }}>
        {group(false)}
        {group(true)}
      </div>
    </section>
  );
}

const marqueeCss = `
.ymq-bar {
  position: relative;
  overflow: hidden;
  background: var(--primary);
  color: #fff;
  border-top: 1px solid color-mix(in srgb, var(--primary-dark) 60%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--primary-dark) 60%, transparent);
}
.ymq-track {
  display: flex;
  width: max-content;
  animation-name: ymq-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}
.ymq-bar:hover .ymq-track {
  animation-play-state: paused;
}
.ymq-group {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}
.ymq-item {
  display: flex;
  align-items: center;
}
.ymq-text {
  padding: 5px 1.5rem;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
@media (min-width: 768px) {
  .ymq-text {
    font-size: 0.95rem;
    padding-top: 0.55rem;
    padding-bottom: 0.55rem;
  }
}
.ymq-sep {
  color: color-mix(in srgb, var(--primary-light) 75%, transparent);
  font-size: 0.7rem;
}
.ymq-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2.5rem;
  z-index: 10;
  pointer-events: none;
}
.ymq-fade-left {
  left: 0;
  background: linear-gradient(to right, var(--primary), transparent);
}
.ymq-fade-right {
  right: 0;
  background: linear-gradient(to left, var(--primary), transparent);
}
@keyframes ymq-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .ymq-track { animation-duration: 90s !important; }
}
`;
