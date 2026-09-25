export type View = 'jsoncleaner' | 'crashlytics' | 'models' | 'swagger';

export type Category = 'datos' | 'depurar';

export interface Route {
  view: View;
  path: string;
  label: string;
  title: string;
  description: string;
  category: Category;
}

export const SITE_NAME = 'Depura';
export const SITE_URL = 'https://depura.antcruz.dev';

export const ROUTES: Route[] = [
  {
    view: 'jsoncleaner',
    path: '/json',
    label: 'JSON Cleaner',
    title: 'Limpiador y comparador de JSON',
    description:
      'Limpia JSON pegado desde Logcat, dale formato, míralo como árbol o tabla y compara dos documentos lado a lado. Todo en tu navegador.',
    category: 'datos',
  },
  {
    view: 'crashlytics',
    path: '/crashlytics',
    label: 'Crashlytics',
    title: 'Formateador de stack traces',
    description:
      'Ordena la indentación de un stack trace de Android y colorea cada frame según su origen: tu app, Android, Java/Kotlin o librerías.',
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
