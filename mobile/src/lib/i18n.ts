import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import bn from '../locales/bn.json';
import or from '../locales/or.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  or: { translation: or },
};

const getBestLanguage = () => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const code = locales[0].languageCode;
    if (code && ['en', 'hi', 'bn', 'or'].includes(code)) {
      return code;
    }
  }
  return 'hi'; // Default field language in Indian mines
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getBestLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;
