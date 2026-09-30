export function probeImage(url: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      img.onload = img.onerror = null;
      img.src = '';
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(img.naturalWidth > 0);
    img.onerror = () => finish(false);
    img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  });
}
