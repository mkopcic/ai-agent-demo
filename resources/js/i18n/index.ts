import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './translations';

export const defaultLocale = 'hr';

void i18n.use(initReactI18next).init({
    resources,
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
