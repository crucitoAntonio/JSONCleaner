import TurndownService from 'turndown';
import { gfm } from '@truto/turndown-plugin-gfm';

export interface MarkdownOptions {
  onlyContent: boolean;
  images: boolean;
}

export const DEFAULT_OPTIONS: MarkdownOptions = { onlyContent: true, images: false };

const ALWAYS_REMOVED = ['script', 'style', 'noscript', 'iframe', 'svg', 'template', 'head'];
const LAYOUT_REMOVED = ['nav', 'header', 'footer', 'aside', 'form', 'button'];

function buildService(options: MarkdownOptions): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  });
  service.use(gfm);
  service.addRule('listItem', {
    filter: 'li',
    replacement: (content, node) => {
      const parent = node.parentNode as HTMLElement;
      let prefix = '- ';
      if (parent.nodeName === 'OL') {
        const start = Number(parent.getAttribute('start') ?? 1);
        const index = Array.prototype.indexOf.call(parent.children, node);
        prefix = start + index + '. ';
      }
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n/g, '\n' + ' '.repeat(prefix.length));
      return prefix + body + (node.nextSibling && !/\n$/.test(body) ? '\n' : '');
    },
  });
  service.remove([...ALWAYS_REMOVED, ...(options.onlyContent ? LAYOUT_REMOVED : [])] as never);
  if (!options.images) {
    service.addRule('sinImagenes', { filter: 'img', replacement: () => '' });
  }
  return service;
}

export function htmlToMarkdown(html: string, options: MarkdownOptions = DEFAULT_OPTIONS): string {
  if (!html.trim()) return '';
  return buildService(options)
    .turndown(html)
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i.test(text);
}
