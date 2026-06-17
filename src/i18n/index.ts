import en from "./locales/en";
import ru from "./locales/ru";

const locales: Record<string, any> = { en, ru };

let currentLang: "en" | "ru" = "en";

export function setLanguage(lang: string) {
    if (locales[lang]) {
        currentLang = lang as "en" | "ru";
    } else {
        currentLang = "en";
    }
}

export function t(key: string): string {
    const keys = key.split(".");
    let value = locales[currentLang];

    for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
            value = value[k];
        } else {
            return key;
        }
    }

    return typeof value === "string" ? value : key;
}
