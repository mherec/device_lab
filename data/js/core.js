const language = "polski";
const pin = "2580";


document.addEventListener('DOMContentLoaded', () => {
    loockScreen();
});

function appInitUpdate() {
    if (window.app) {
        for (let key in app) {
            if (app.hasOwnProperty(key)) delete app[key];
        }
    } else {
        window.app = {};
    }
}

let translations = {}; // <- tłumaczenia

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

async function getEndpointData(url) {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Błąd żądania: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Błąd podczas pobierania danych:", error);
        return null;
    }
}

async function postEndpointData(url, payload = {}) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Błąd żądania: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Błąd podczas wysyłania danych:", error);
        return null;
    }
}

// nowa funkcja, stare skasować 
async function apiRequest(url, method = "GET", payload = null) {
    try {
        const options = {
            method,
            headers: {
                "Accept": "application/json",
            }
        };

        if (payload) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(payload);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`Błąd żądania: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Błąd podczas zapytania:", error);
        return null;
    }
}


function loockScreen() {
    const overlay = document.createElement("div");
    overlay.id = "lockOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backdropFilter = "blur(10px)";
    overlay.style.background = "rgba(0,0,0,0.4)";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";

    const title = document.createElement("div");
    title.innerText = "Wprowadź PIN";
    title.style.color = "white";
    title.style.fontSize = "24px";
    title.style.marginBottom = "20px";

    const input = document.createElement("input");
    input.type = "password";
    input.placeholder = "PIN";
    input.style.padding = "10px 20px";
    input.style.fontSize = "20px";
    input.style.borderRadius = "12px";
    input.style.border = "none";
    input.style.outline = "none";
    input.style.textAlign = "center";
    input.style.letterSpacing = "5px";
    input.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";

    input.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            if (input.value === pin) {
                document.body.removeChild(overlay);
            } else {
                input.value = "";
                input.placeholder = "Błędny PIN!";
                input.style.border = "2px solid red";
                setTimeout(() => {
                    input.placeholder = "PIN";
                    input.style.border = "none";
                }, 1500);
            }
        }
    });

    overlay.appendChild(title);
    overlay.appendChild(input);
    document.body.appendChild(overlay);
}
