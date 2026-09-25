import ImageTracer from 'imagetracerjs';
import { toTracerOptions } from './settings';
import type { TraceSettings } from './settings';

export interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function isFullCanvas(d: string, width: number, height: number): boolean {
  return d.trimStart().startsWith(`M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} L 0 0 Z`);
}

export function cleanSvg(
  svg: string,
  { width, height, removeBackground }: { width: number; height: number; removeBackground: boolean },
): string {
  return svg
    .replace(/\s+desc="[^"]*"\s*/, ' ')
    .replace(/\s+>/, '>')
    .replace(/<path\b[^>]*\/>/g, (path) => {
      const opacity = /opacity="([\d.]+)"/.exec(path)?.[1];
      if (opacity !== undefined && Number(opacity) === 0) return '';
      const d = /\sd="([^"]*)"/.exec(path)?.[1] ?? '';
      if (removeBackground && isFullCanvas(d, width, height)) return '';
      return path
        .replace(/ opacity="1"/, '')
        .replace(/opacity="([\d.]+)"/, (_, o: string) => `opacity="${Number(o).toFixed(3)}"`)
        .replace(/ Z " \/>$/, ' Z"/>')
        .replace(/ " \/>$/, '"/>');
    });
}

export function traceToSvg(imgd: ImageDataLike, settings: TraceSettings): string {
  const raw = ImageTracer.imagedataToSVG(imgd, toTracerOptions(settings));
  return cleanSvg(raw, {
    width: imgd.width,
    height: imgd.height,
    removeBackground: settings.removeBackground,
  });
}
