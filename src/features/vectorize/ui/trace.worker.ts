import { traceToSvg } from '../model/trace';
import type { TraceSettings } from '../model/settings';

export interface TraceRequest {
  id: number;
  width: number;
  height: number;
  data: Uint8ClampedArray;
  settings: TraceSettings;
}

export type TraceResponse = { id: number; svg: string } | { id: number; error: true };

self.onmessage = (e: MessageEvent<TraceRequest>) => {
  const { id, width, height, data, settings } = e.data;
  let response: TraceResponse;
  try {
    response = { id, svg: traceToSvg({ width, height, data }, settings) };
  } catch {
    response = { id, error: true };
  }
  self.postMessage(response);
};
