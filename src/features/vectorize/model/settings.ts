export type PresetId = 'logo' | 'bw' | 'detailed';

export interface TraceSettings {
  colors: number;
  minArea: number;
  smooth: boolean;
  removeBackground: boolean;
  blackAndWhite: boolean;
}

export const PRESETS: { id: PresetId; label: string; hint: string; settings: TraceSettings }[] = [
  {
    id: 'logo',
    label: 'Logo',
    hint: 'Pocos colores y curvas limpias: logos, íconos e ilustraciones planas',
    settings: {
      colors: 6,
      minArea: 8,
      smooth: false,
      removeBackground: true,
      blackAndWhite: false,
    },
  },
  {
    id: 'bw',
    label: 'Blanco y negro',
    hint: 'Dos colores: firmas, dibujos a línea y texto escaneado',
    settings: { colors: 2, minArea: 8, smooth: true, removeBackground: true, blackAndWhite: true },
  },
  {
    id: 'detailed',
    label: 'Detallado',
    hint: 'Más colores y detalle: ilustraciones complejas (archivos más pesados)',
    settings: {
      colors: 24,
      minArea: 2,
      smooth: false,
      removeBackground: false,
      blackAndWhite: false,
    },
  },
];

export const MAX_TRACE_SIDE = 1024;
export const HEAVY_SVG_BYTES = 500 * 1024;

export function toTracerOptions(s: TraceSettings): Record<string, unknown> {
  return {
    numberofcolors: s.blackAndWhite ? 2 : s.colors,
    colorsampling: s.blackAndWhite ? 0 : 2,
    colorquantcycles: s.blackAndWhite ? 1 : 3,
    ...(s.blackAndWhite
      ? {
          pal: [
            { r: 0, g: 0, b: 0, a: 255 },
            { r: 255, g: 255, b: 255, a: 255 },
          ],
        }
      : {}),
    pathomit: s.minArea,
    blurradius: s.smooth ? 3 : 0,
    blurdelta: 20,
    ltres: 1,
    qtres: 1,
    rightangleenhance: true,
    roundcoords: 1,
    viewbox: true,
    desc: false,
  };
}

export function fitSize(width: number, height: number, max = MAX_TRACE_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: scale < 1,
  };
}

export function svgStats(svg: string): { bytes: number; paths: number } {
  return {
    bytes: new TextEncoder().encode(svg).length,
    paths: (svg.match(/<path\b/g) ?? []).length,
  };
}
