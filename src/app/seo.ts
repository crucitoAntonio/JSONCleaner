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
        text: 'Quita los prefijos de Logcat (Android Studio y adb logcat en formatos threadtime y brief) y corrige las comillas duplicadas estilo CSV ("").',
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
  crashlytics: {
    h1: 'Formatear stack traces de Android y Crashlytics',
    intro: [
      'Pega una traza de excepción copiada de Firebase Crashlytics o de Logcat y presiona ✨ Formatear. Depura acomoda la indentación, junta los frames repetidos y colorea cada línea según su origen, para que encuentres rápido dónde falló tu código.',
      'Todo pasa en tu navegador: la traza no se envía a ningún servidor.',
    ],
    features: [
      {
        title: 'Resalta tu código',
        text: 'Escribe el paquete de tu app (por ejemplo com.pixelquest.game) y sus frames se marcan en color, separados de Android/AndroidX, Java/Kotlin y librerías de terceros.',
      },
      {
        title: 'Acomoda la indentación',
        text: 'Todos los frames quedan con la misma sangría y se quitan las líneas vacías, aunque la traza venga de un chat o de un correo.',
      },
      {
        title: 'Agrupa frames repetidos',
        text: 'Los frames idénticos seguidos se juntan en uno solo con (×N).',
      },
      {
        title: 'Resume la recursión',
        text: 'Los bloques de frames que se repiten, típicos de un StackOverflowError, se resumen en «↻ Se repite N veces» con el bloque una sola vez.',
      },
      {
        title: 'Sigue la cadena de errores',
        text: 'Resalta los encabezados de excepción, Caused by:, Suppressed: y ... N more.',
      },
      {
        title: 'Copia o descarga',
        text: 'Copia la traza limpia para un ticket o un pull request, o descárgala como .txt.',
      },
    ],
    faq: [
      {
        q: '¿La traza se envía a algún servidor?',
        a: 'No. El formateo y el resaltado se hacen en tu navegador. Solo el paquete de tu app se recuerda, en el almacenamiento local de tu navegador.',
      },
      {
        q: '¿Qué paquete debo escribir?',
        a: 'El paquete base de tu código, por ejemplo com.pixelquest.game. Todas las clases que empiezan con ese prefijo se resaltan como tuyas.',
      },
      {
        q: '¿Puedo pegar una traza de Logcat?',
        a: 'Sí, pégala tal cual. Al formatear se quitan los prefijos de cada línea (fecha, PID, nivel y tag) del Logcat de Android Studio y de adb logcat en formatos threadtime y brief, además de separadores como «--------- beginning of crash».',
      },
      {
        q: '¿Qué significa «↻ Se repite N veces»?',
        a: 'Que un grupo de frames aparecía varias veces seguidas, por ejemplo dos funciones que se llaman entre sí. Depura lo muestra una vez con el número de repeticiones, para que la traza no ocupe miles de líneas.',
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
