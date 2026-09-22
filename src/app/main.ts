import '../shared/ui/styles/tokens.css';
import '../shared/ui/styles/base.css';
import '../shared/ui/styles/panel.css';
import './app.css';

import { initRouter } from './router';
import { initJsonCleaner } from '../features/json-cleaner';
import { initCrashlytics } from '../features/crashlytics';

initRouter();
initJsonCleaner();
initCrashlytics();
