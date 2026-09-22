// Menú superior: alterna qué .app-view está visible.
export function initRouter(): void {
  document.querySelectorAll<HTMLButtonElement>('.app-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.app;
      document
        .querySelectorAll('.app-nav-btn')
        .forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll<HTMLElement>('.app-view').forEach((v) => {
        v.hidden = v.dataset.appView !== target;
      });
    });
  });
}
