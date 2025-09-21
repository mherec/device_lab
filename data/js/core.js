const language = "polski";

function appInitUpdate() {
    if (window.app) {
        for (let key in app) {
            if (app.hasOwnProperty(key)) delete app[key];
        }
    } else {
        window.app = {};
    }
}

let translations = {}; // <- tu przechowamy wczytane tłumaczenia

async function loadTranslations() {
    try {
        const response = await fetch(`data/js/languages/${language}.json`);
        translations = await response.json();
        applyTranslations();
    } catch (err) {
        console.error("Błąd wczytywania tłumaczeń:", err);
    }
}

function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });
}