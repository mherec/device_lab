async function loadContent(divId, path) {
    const htmlFile = path.replace(/\/$/, "") + "/app.html";
    const jsFile = path.replace(/\/$/, "") + "/app.js";

    const container = document.getElementById(divId);

    // opcjonalnie: loader
    container.innerHTML = `
        <div class="loader-container">
                <div class="loader"></div>
        </div>
    `;

    try {
        // wczytanie HTML
        const response = await fetch(htmlFile);
        if (!response.ok) throw new Error("Błąd ładowania " + htmlFile);
        const html = await response.text();
        container.innerHTML = html;

        if (window.app) {
            for (let key in app) {
                if (app.hasOwnProperty(key)) delete app[key];
            }
        } else {
            window.app = {};
        }

        const oldScript = document.getElementById('dynamic-app-js');
        if (oldScript) oldScript.remove();

        // --- DYNAMICZNE DODANIE NOWEGO JS ---
        const script = document.createElement("script");
        script.src = jsFile;
        script.id = "dynamic-app-js";
        // script.type = "module"; 
        script.defer = true;

        script.onload = () => {
            if (app.init) app.init();
        };

        document.body.appendChild(script);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:red">Błąd procesu wczytywania lub funkcja nie istnieje</p>`;
    }
    loadTranslations();
}
