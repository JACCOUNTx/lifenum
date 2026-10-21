import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface ShareColor {
  name: string;
  hex: string;
  light?: boolean;
}

export interface ShareCardData {
  appName: string;
  appSub: string;
  dateISO: string;
  dateText: string;
  ganzhiText: string;
  elementName: string;
  elementLabel: string;
  accent: string;
  accentSoft: string;
  phrase: string;
  lifeLine: string;
  paletteTitle: string;
  palette: ShareColor[];
  outfitTitle: string;
  outfits: { scene: string; items: { role: string; name: string; hex: string; light?: boolean }[] }[];
  footerTitle: string;
  footer: string;
}

const SERIF = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif';
const SANS = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';
const INK = '#211d1a';
const MUTED = '#7c746b';

const W = 1080;
const H = 1440;
const M = 76;

type TextOptions = {
  size?: number;
  weight?: string;
  color?: string;
  align?: CanvasTextAlign;
  serif?: boolean;
};

function fillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: TextOptions = {}) {
  const { size = 30, weight = '400', color = INK, align = 'left', serif = false } = opts;
  ctx.font = `${weight} ${size}px ${serif ? SERIF : SANS}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (/\s/.test(text)) {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  const lines: string[] = [];
  let line = '';
  for (const char of Array.from(text)) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function swatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: ShareColor,
) {
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.fillStyle = color.hex;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color.light ? 'rgba(33,29,26,0.18)' : 'rgba(33,29,26,0.08)';
  ctx.stroke();
}

function hairline(ctx: CanvasRenderingContext2D, y: number) {
  ctx.beginPath();
  ctx.moveTo(M, y);
  ctx.lineTo(W - M, y);
  ctx.strokeStyle = 'rgba(33,29,26,0.14)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fbf7f0');
  bg.addColorStop(1, '#efe7d9');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(880, 260, 20, 880, 260, 560);
  glow.addColorStop(0, data.accentSoft);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(150,120,72,0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, W - 52, H - 52);

  fillText(ctx, data.appName, M, 112, { size: 44, weight: '600', serif: true });
  fillText(ctx, data.appSub, M, 152, { size: 24, color: MUTED });
  fillText(ctx, data.dateText, W - M, 112, { size: 26, color: MUTED, align: 'right' });
  fillText(ctx, data.ganzhiText, W - M, 152, { size: 26, color: MUTED, align: 'right' });

  ctx.beginPath();
  ctx.arc(M + 128, 372, 138, 0, Math.PI * 2);
  ctx.fillStyle = data.accentSoft;
  ctx.fill();

  const glyph = data.elementName;
  ctx.textBaseline = 'middle';
  fillText(ctx, glyph, M + 128, 372, {
    size: glyph.length > 4 ? 74 : glyph.length > 2 ? 96 : glyph.length > 1 ? 150 : 210,
    weight: '600',
    color: data.accent,
    align: 'center',
    serif: true,
  });
  ctx.textBaseline = 'alphabetic';

  const colX = M + 312;
  const colW = W - M - colX;
  fillText(ctx, data.elementLabel.toUpperCase(), colX, 300, { size: 24, color: MUTED });

  ctx.font = `600 46px ${SERIF}`;
  const phraseLines = wrapText(ctx, data.phrase, colW);
  phraseLines.slice(0, 3).forEach((line, i) => {
    fillText(ctx, line, colX, 372 + i * 60, { size: 46, weight: '600', serif: true });
  });
  fillText(ctx, data.lifeLine, colX, 372 + Math.min(phraseLines.length, 3) * 60 + 44, {
    size: 28,
    color: MUTED,
  });

  hairline(ctx, 566);

  fillText(ctx, data.paletteTitle, M, 636, { size: 32, weight: '600', serif: true });
  const palette = data.palette.slice(0, 4);
  const gap = 148;
  palette.forEach((color, i) => {
    const x = M + i * gap;
    swatch(ctx, x, 682, 34, color);
    fillText(ctx, color.name, x + 34, 790, { size: 24, align: 'center', color: MUTED });
  });

  fillText(ctx, data.outfitTitle, M, 880, { size: 32, weight: '600', serif: true });

  data.outfits.slice(0, 3).forEach((outfit, row) => {
    const baseY = 936 + row * 92;
    fillText(ctx, outfit.scene, M, baseY + 12, { size: 26, weight: '600', color: MUTED });
    const itemX = M + 172;
    const itemW = (W - M - itemX) / 4;
    outfit.items.slice(0, 4).forEach((item, i) => {
      const x = itemX + i * itemW;
      swatch(ctx, x, baseY - 8, 15, item);
      fillText(ctx, item.role, x + 42, baseY - 4, { size: 20, color: MUTED });
      fillText(ctx, item.name, x + 42, baseY + 24, { size: 23 });
    });
  });

  hairline(ctx, 1246);

  fillText(ctx, data.footerTitle, M, 1300, { size: 28, weight: '600', serif: true });
  ctx.font = `400 24px ${SANS}`;
  const footerLines = wrapText(ctx, data.footer, W - M * 2);
  footerLines.slice(0, 3).forEach((line, i) => {
    fillText(ctx, line, M, 1342 + i * 34, { size: 24, color: MUTED });
  });

  fillText(ctx, `${data.appName} · ${data.appSub}`, W / 2, 1392, {
    size: 22,
    color: 'rgba(33,29,26,0.45)',
    align: 'center',
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

function isCancel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|abort/i.test(message);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export async function shareCard(
  canvas: HTMLCanvasElement,
  fileName: string,
  caption: string,
): Promise<ShareResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      const written = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: caption,
        text: caption,
        files: [written.uri],
        dialogTitle: caption,
      });
      return 'shared';
    } catch (error) {
      return isCancel(error) ? 'cancelled' : 'failed';
    }
  }

  const blob = await canvasToBlob(canvas);
  if (!blob) return 'failed';

  const file = new File([blob], fileName, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption });
      return 'shared';
    } catch (error) {
      if (isCancel(error)) return 'cancelled';
    }
  }

  downloadBlob(blob, fileName);
  return 'downloaded';
}

export async function downloadCard(canvas: HTMLCanvasElement, fileName: string): Promise<ShareResult> {
  const blob = await canvasToBlob(canvas);
  if (!blob) return 'failed';
  downloadBlob(blob, fileName);
  return 'downloaded';
}
