import { Translations } from '@/i18n/locales';

export type TitleTranslationKey = keyof Translations['profile']['titles'];

export function getTitleKeyByCount(count: number, isAnonymous: boolean): TitleTranslationKey {
    if (isAnonymous) {
        return 'passerby';
    }
    if (count > 99) return 'grandMaster';
    if (count >= 50) return 'master';
    if (count >= 10) return 'keeper';
    return 'apprentice';
}
