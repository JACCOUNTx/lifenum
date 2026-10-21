import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { copyText } from '../lib/clipboard';
import { downloadCard, drawShareCard, shareCard, type ShareCardData } from '../lib/shareCard';
import { Sheet } from './ui';

interface ShareSheetProps {
  open: boolean;
  data: ShareCardData;
  caption: string;
  onClose: () => void;
}

export function ShareSheet({ open, data, caption, onClose }: ShareSheetProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !canvasRef.current) return;
      drawShareCard(canvasRef.current, data);
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(render).catch(render);
    } else {
      render();
    }
    return () => {
      cancelled = true;
    };
  }, [open, data]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const fileName = `lifenum-${data.dateISO}.png`;

  const handleCopy = async () => {
    const ok = await copyText(caption);
    if (ok) setStatus(t.today.copied);
  };

  return (
    <Sheet open={open} title={t.today.share} closeLabel={t.common.close} onClose={onClose}>
      <div className="share-preview">
        <canvas ref={canvasRef} />
      </div>

      <div className="share-actions">
        {!native ? (
          <button
            type="button"
            className="ghost-btn"
            onClick={async () => {
              if (!canvasRef.current) return;
              const result = await downloadCard(canvasRef.current, fileName);
              if (result === 'downloaded') setStatus(t.today.downloaded);
            }}
          >
            {t.today.download}
          </button>
        ) : null}
        <button
          type="button"
          className="primary-btn"
          onClick={async () => {
            if (!canvasRef.current) return;
            const result = await shareCard(canvasRef.current, fileName, caption);
            if (result === 'downloaded') setStatus(t.today.downloaded);
            if (result === 'shared') setStatus(t.common.saved);
            if (result === 'failed') setStatus(t.today.shareFailed);
          }}
        >
          {t.today.shareAction}
        </button>
        <button type="button" className="ghost-btn" onClick={handleCopy}>
          {t.today.copy}
        </button>
      </div>

      {status ? <p className="share-status">{status}</p> : null}
    </Sheet>
  );
}
