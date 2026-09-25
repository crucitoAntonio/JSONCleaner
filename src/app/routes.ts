export type View = 'jsoncleaner' | 'crashlytics' | 'models' | 'swagger' | 'jwt' | 'encode';

export type Category = 'datos' | 'depurar' | 'codificar';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'datos', label: 'Datos' },
  { id: 'depurar', label: 'Depurar' },
  { id: 'codificar', label: 'Codificar' },
];

export interface Route {
  view: View;
  path: string;
  label: string;
  title: string;
  description: string;
  category: Category;
  featured?: boolean;
}

export const SITE_NAME = 'Depura';
export const SITE_URL = 'https://depura.antcruz.dev';

export const ROUTES: Route[] = [
  {
    view: 'jsoncleaner',
    path: '/json',
    label: 'JSON Cleaner',
    title: 'Formatear, validar y comparar JSON online',
    description:
      'Formatea, valida y compara JSON gratis. Limpia JSON pegado desde Logcat o adb, míralo como árbol o tabla y consúltalo con JSONPath. Todo en tu navegador.',
    category: 'datos',
    featured: true,
  },
  {
    view: 'crashlytics',
    path: '/crashlytics',
    label: 'Crashlytics',
    title: 'Formatear stack traces de Android y Crashlytics',
    description:
      'Pega un stack trace de Crashlytics o Logcat: lo reindenta, agrupa frames repetidos y resalta las clases de tu app frente a Android, Java/Kotlin y librerías.',
    category: 'depurar',
  },
  {
    view: 'models',
    path: '/modelos',
    label: 'Modelos',
    title: 'Generador de modelos Kotlin y Java',
    description:
      'Pega JSON, YAML o una especificación Swagger/OpenAPI y obtén data classes de Kotlin o POJOs de Java, sin salir del navegador.',
    category: 'datos',
  },
  {
    view: 'swagger',
    path: '/swagger',
    label: 'Swagger',
    title: 'Editor de Swagger / OpenAPI',
    description: 'Edita y valida especificaciones OpenAPI con el Swagger Editor oficial.',
    category: 'datos',
  },
  {
    view: 'jwt',
    path: '/jwt',
    label: 'JWT',
    title: 'Decodificador y verificador de JWT',
    description:
      'Decodifica el header y el payload de un JSON Web Token, revisa si ya expiró, detecta claims sensibles y verifica la firma. El token nunca sale de tu navegador.',
    category: 'depurar',
  },
  {
    view: 'encode',
    path: '/base64',
    label: 'Base64 / URL',
    title: 'Codificar y decodificar Base64 y URL',
    description:
      'Codifica y decodifica texto en Base64, Base64URL y codificación de URL (porcentaje), con soporte completo de acentos y emoji. Todo en tu navegador.',
    category: 'codificar',
  },
];

export const HOME_VIEW: View = 'jsoncleaner';

export function routeFor(view: View): Route {
  return ROUTES.find((r) => r.view === view)!;
}

export function viewFromPath(pathname: string): View | null {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/') return HOME_VIEW;
  return ROUTES.find((r) => r.path === path)?.view ?? null;
}

export function pageTitle(route: Route): string {
  return `${route.title} · ${SITE_NAME}`;
}
