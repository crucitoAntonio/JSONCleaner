import { SITE_NAME, SITE_URL } from './routes.ts';
import type { Route, View } from './routes.ts';

export interface ToolContent {
  h1: string;
  intro: string[];
  features: { title: string; text: string }[];
  faq: { q: string; a: string }[];
}

export const TOOL_CONTENT: Partial<Record<View, ToolContent>> = {
  jsoncleaner: {
    h1: 'Formatear, validar y comparar JSON online',
    intro: [
      'Pega tu JSON y dale formato con un clic (✨ o ⌘/Ctrl + Enter). Si viene de Android Logcat o de adb logcat, Depura quita los prefijos de cada línea (fecha, PID, tag) y encuentra el JSON dentro del log.',
      'Todo pasa en tu navegador: tu JSON no se envía a ningún servidor.',
    ],
    features: [
      {
        title: 'Formatear y validar',
        text: 'Indenta el JSON y, si no es válido, te dice dónde está el error.',
      },
      {
        title: 'Limpiar JSON de logs',
        text: 'Quita los prefijos de Logcat (formatos brief y threadtime) y corrige las comillas duplicadas estilo CSV ("").',
      },
      {
        title: 'Comparar dos JSON',
        text: 'Diferencias estructurales lado a lado: campos agregados, eliminados y modificados, en el árbol y línea por línea.',
      },
      {
        title: 'Verlo como árbol o tabla',
        text: 'Navega objetos anidados, o convierte un arreglo de objetos en una tabla.',
      },
      {
        title: 'Consultar con JSONPath',
        text: 'Filtra con expresiones como $.items[?(@.price > 10)].name y ve solo lo que buscas.',
      },
      {
        title: 'Guardar documentos',
        text: 'Guarda tus JSON en el navegador para volver a ellos después.',
      },
    ],
    faq: [
      {
        q: '¿Mi JSON se envía a algún servidor?',
        a: 'No. El formateo, la validación y la comparación se hacen en tu navegador. Los documentos que guardas se quedan en el almacenamiento local de tu navegador.',
      },
      {
        q: '¿Cómo formateo JSON que copié de Logcat?',
        a: 'Pega las líneas del log tal cual en un documento y presiona ✨ Formatear. Depura quita los prefijos de cada línea y extrae el primer objeto o arreglo JSON completo.',
      },
      {
        q: '¿Qué pasa si mi JSON no es válido?',
        a: 'El indicador del documento se pone rojo y el mensaje dice dónde está el error. Las comillas duplicadas ("") se corrigen solas, y para otros errores comunes Depura puede ofrecerte repararlo.',
      },
      {
        q: '¿Cómo comparo dos JSON?',
        a: 'Pega uno en el Documento A y otro en el Documento B y presiona Comparar. Verás las diferencias resaltadas en el árbol y línea por línea.',
      },
    ],
  },
};

export function jsonLdFor(route: Route): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${route.label} · ${SITE_NAME}`,
    headline: TOOL_CONTENT[route.view]?.h1 ?? route.title,
    description: route.description,
    url: `${SITE_URL}${route.path}`,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requiere JavaScript',
    inLanguage: 'es',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}
