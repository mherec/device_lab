async function loadContent(divId, path) {
    const htmlFile = path.replace(/\/$/, "") + "/app.html";
    const jsFile = path.replace(/\/$/, "") + "/app.js";

    const container = document.getElementById(divId);

    // loader
    container.innerHTML = `
        <div class="loader-container">
            <div class="loader"></div>
        </div>
    `;

    try {
        // wczytanie HTML
        const response = await fetch(htmlFile + "?v=" + Date.now());
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
        script.src = jsFile + "?v=" + Date.now(); // ⬅️ zawsze unikalny adres
        script.id = "dynamic-app-js";
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



const db = new Dexie("database");
db.version(1).stores({
    equ: "++id, name, index, pcs, info",
});


// Dodawanie danych
async function addData() {
    await db.equ.add({ name: "MODBUS RTU RELAY x4", index: "MAT/ELE/00365", pcs: 3, info: "Ostatnie" });

    console.log("Dane dodane");
}

// pamięć aplikacji (cache)
let memory = {
    equ: []
};

// funkcja pobierająca dane z wybranej tabeli
async function loadTable(tableName) {
    try {
        const data = await db[tableName].toArray();
        memory[tableName] = data;   // zapis do pamięci
        console.log(`Załadowano tabelę "${tableName}" do pamięci:`, data);
        return data;
    } catch (err) {
        console.error(`Błąd przy pobieraniu tabeli ${tableName}:`, err);
        return [];
    }
}

// inicjalizacja bazy i załadowanie przy starcie
db.open().then(async () => {
    await loadTable("equ");
    // możesz odświeżyć później:
    // await loadTable("equ");
}).catch((err) => {
    console.error("Błąd przy otwieraniu bazy:", err);
});



function exportMemoryToJSON(filename = "backup.json") {
    try {
        // Tworzymy JSON ze wszystkich tabel w pamięci
        const dataStr = JSON.stringify(memory, null, 2);

        // Tworzymy obiekt Blob i link do pobrania
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
        console.log("Dane wyeksportowane do pliku:", filename);
    } catch (err) {
        console.error("Błąd przy eksporcie danych:", err);
    }
}


// zegar
