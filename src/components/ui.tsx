import { useEffect, useRef, type ReactNode } from 'react';
import type { ColorDef, Element } from '../lib/wuxing';
import { ELEMENT_SOFT, ELEMENT_TEXT_COLORS } from '../lib/wuxing';

export function ColorDot({ color, size = 22 }: { color: ColorDef; size?: number }) {
  return (
    <span
      className="color-dot"
      style={{
        width: size,
        height: size,
        background: color.hex,
        boxShadow: color.light ? 'inset 0 0 0 1px rgba(33,29,26,0.16)' : 'none',
      }}
    />
  );
}

export function ColorPill({
  color,
  name,
  muted = false,
}: {
  color: ColorDef;
  name: string;
  muted?: boolean;
}) {
  return (
    <span className={`color-pill${muted ? ' is-muted' : ''}`}>
      <ColorDot color={color} size={16} />
      {name}
    </span>
  );
}

export function ElementBadge({ element, children }: { element: Element; children: ReactNode }) {
  return (
    <span
      className="element-badge"
      style={{ color: ELEMENT_TEXT_COLORS[element], background: ELEMENT_SOFT[element] }}
    >
      {children}
    </span>
  );
}

export function Sheet({
  open,
  title,
  closeLabel,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className={`sheet-layer${wide ? ' is-wide' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={`sheet${wide ? ' is-wide' : ''}`}>
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer ? <footer className="sheet-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
