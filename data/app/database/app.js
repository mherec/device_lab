appInitUpdate();

app = {

    init: function () {
        this.initWarehouseTable();
    },

    initWarehouseTable: function () {
        // Zmienne stanu
        this.warehouseTable = null;
        this.warehouseOriginalData = [];
        this.warehouseCurrentData = [];
        this.warehouseEditedRows = new Set();

        try {
            getEndpointData("api/warehouse").then(data => {
                this.warehouseOriginalData = data.data || [];
                this.warehouseCurrentData = this.warehouseOriginalData.map(row => ({
                    ...row,
                    _original: { ...row }
                }));

                this.warehouseTable = new Tabulator("#ware-table", {
                    height: "800px",
                    layout: "fitColumns",
                    selectable: true,
                    rowContextMenu: this.getWarehouseContextMenu(),
                    columns: [
                        {
                            title: "ID",
                            field: "id",
                            width: 70,
                            visible: false
                        },
                        {
                            title: "Nazwa",
                            field: "name",
                            editor: "input",
                            validator: "required",
                            headerFilter: "input",
                            cellEdited: (cell) => this.markWarehouseRowAsEdited(cell.getRow())
                        },
                        {
                            title: "Index",
                            field: "code",
                            editor: "input",
                            validator: "required",
                            headerFilter: "input",
                            cellEdited: (cell) => this.markWarehouseRowAsEdited(cell.getRow())
                        },
                        {
                            title: "Ilość",
                            field: "quantity",
                            editor: "number",
                            validator: "min:0",
                            headerFilter: "number",
                            formatter: this.warehouseQuantityFormatter.bind(this),
                            cellEdited: (cell) => this.markWarehouseRowAsEdited(cell.getRow())
                        },
                        {
                            title: "Notatka",
                            field: "note",
                            editor: "input",
                            headerFilter: "input",
                            width: 200,
                            cellEdited: (cell) => this.markWarehouseRowAsEdited(cell.getRow())
                        },
                        {
                            title: "Akcje",
                            formatter: this.warehouseActionsFormatter.bind(this),
                            width: 100,
                            headerSort: false,
                            cellClick: this.handleWarehouseActionClick.bind(this)
                        }
                    ],
                    data: this.warehouseCurrentData,
                });

                console.log("Tabela magazynu zainicjalizowana z danymi:", this.warehouseCurrentData.length);
                this.setupWarehouseEventListeners();
            }).catch(error => {
                console.error("Błąd ładowania danych magazynu:", error);
                this.showWarehouseError("Nie udało się załadować danych z magazynu");
            });
        } catch (e) {
            console.error("Błąd inicjalizacji tabeli magazynu:", e);
            this.showWarehouseError("Błąd inicjalizacji tabeli");
        }
    },

    setupWarehouseEventListeners: function () {
        document.getElementById('base_save')?.addEventListener('click', () => this.saveWarehouseData());
        document.getElementById('base_export')?.addEventListener('click', () => this.exportWarehouseData());
        document.getElementById('base_search')?.addEventListener('click', () => this.toggleWarehouseSearch());
        document.getElementById('base_refresh')?.addEventListener('click', () => this.refreshWarehouseData());
        document.getElementById('base_add')?.addEventListener('click', () => this.addWarehouseNewRow());
        document.getElementById('base_delete')?.addEventListener('click', () => this.deleteWarehouseSelectedRows());

        const searchApply = document.getElementById('search-apply');
        const searchCancel = document.getElementById('search-cancel');
        const searchInput = document.getElementById('search-input');

        if (searchApply) searchApply.addEventListener('click', () => this.applyWarehouseSearch());
        if (searchCancel) searchCancel.addEventListener('click', () => this.cancelWarehouseSearch());
        if (searchInput) searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyWarehouseSearch();
        });
    },

    // POPRAWIONA METODA ZAPISU
    saveWarehouseData: async function () {
        if (!this.warehouseTable) return;

        try {
            const editedRows = this.getWarehouseEditedRows();
            console.log("Edytowane wiersze do zapisu:", editedRows);

            if (editedRows.length === 0) {
                this.showWarehouseMessage("Brak zmian do zapisania");
                return;
            }

            this.showWarehouseMessage("💾 Zapisuję dane...");

            let successCount = 0;
            let errorCount = 0;
            let errors = [];

            for (const rowData of editedRows) {
                try {
                    let result;

                    if (rowData.id) {
                        // Aktualizacja istniejącego rekordu - tylko ilość
                        console.log(`Aktualizacja ilości dla ID ${rowData.id}: ${rowData.quantity}`);
                        result = await apiRequest(`/api/warehouse/${rowData.id}/quantity`, 'PUT', {
                            quantity: parseInt(rowData.quantity) || 0
                        });
                    } else {
                        // Nowy rekord
                        console.log("Dodawanie nowego rekordu:", rowData);
                        result = await apiRequest('/api/warehouse', 'POST', {
                            name: rowData.name,
                            code: rowData.code,
                            quantity: parseInt(rowData.quantity) || 0,
                            note: rowData.note || ''
                        });

                        if (result && result.success && result.id) {
                            // Oznacz jako zapisany
                            this.markWarehouseRowAsSaved(rowData);
                        }
                    }

                    if (result && result.success) {
                        successCount++;
                        this.markWarehouseRowAsSaved(rowData);
                    } else {
                        errorCount++;
                        const errorMsg = result?.error || 'Nieznany błąd API';
                        errors.push(`Wiersz "${rowData.name || 'bez nazwy'}": ${errorMsg}`);
                        console.error("Błąd API:", result);
                    }

                } catch (error) {
                    console.error("Błąd zapisu wiersza:", rowData, error);
                    errorCount++;
                    errors.push(`Wiersz "${rowData.name || 'bez nazwy'}": ${error.message}`);
                }
            }

            // Odśwież dane po zapisie
            await this.refreshWarehouseData();

            if (errorCount === 0) {
                this.showWarehouseMessage(`✅ Pomyślnie zapisano ${successCount} rekordów`);
            } else {
                const errorMsg = `⚠️ Zapiszono ${successCount} rekordów, ${errorCount} błędów:\n${errors.join('\n')}`;
                this.showWarehouseError(errorMsg);
            }

        } catch (error) {
            console.error("Błąd podczas zapisu:", error);
            this.showWarehouseError("Błąd podczas zapisywania danych: " + error.message);
        }
    },

    // POPRAWIONE DODAWANIE NOWEGO WIERSZA
    addWarehouseNewRow: function () {
        if (!this.warehouseTable) return;

        const newRow = {
            name: '',
            code: '',
            quantity: 0,
            note: '',
            _id: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };

        // Bezpośrednie dodanie do danych tabeli
        this.warehouseTable.addRow(newRow, true);
        this.warehouseEditedRows.add(newRow._id);

        // Przewiń do końca tabeli
        setTimeout(() => {
            const rows = this.warehouseTable.getRows();
            if (rows.length > 0) {
                const lastRow = rows[rows.length - 1];
                this.warehouseTable.scrollToRow(lastRow, 'bottom', false);
            }
        }, 100);

        this.showWarehouseMessage("➕ Dodano nowy wiersz");
    },

    // POPRAWIONE USUWANIE ZAZNACZONYCH WIERSZY
    deleteWarehouseSelectedRows: function () {
        if (!this.warehouseTable) return;

        const selectedRows = this.warehouseTable.getSelectedRows();

        if (selectedRows.length === 0) {
            this.showWarehouseMessage("⚠️ Nie zaznaczono żadnych wierszy do usunięcia");
            return;
        }

        if (!confirm(`Czy na pewno chcesz usunąć ${selectedRows.length} zaznaczonych wierszy?`)) {
            return;
        }

        try {
            // Usuń każdy zaznaczony wiersz
            selectedRows.forEach(row => {
                const rowData = row.getData();
                if (rowData._id) {
                    this.warehouseEditedRows.delete(rowData._id);
                }

                // Jeśli wiersz ma ID, usuń z backendu
                if (rowData.id) {
                    this.deleteWarehouseItemFromBackend(rowData.id);
                }

                // Usuń z tabeli
                row.delete();
            });

            this.showWarehouseMessage(`🗑️ Usunięto ${selectedRows.length} wierszy`);

        } catch (error) {
            console.error("Błąd usuwania wierszy:", error);
            this.showWarehouseError("Błąd podczas usuwania wierszy");
        }
    },

    // NOWA METODA: Usuwanie z backendu
    deleteWarehouseItemFromBackend: async function (itemId) {
        try {
            await apiRequest(`/api/warehouse/${itemId}`, 'DELETE');
            console.log(`✅ Usunięto z backendu ID: ${itemId}`);
        } catch (error) {
            console.error(`❌ Błąd usuwania z backendu ID ${itemId}:`, error);
            this.showWarehouseError(`Nie udało się usunąć pozycji ID ${itemId} z bazy danych`);
        }
    },

    // POZOSTAŁE METODY (bez zmian)
    exportWarehouseData: function () {
        if (!this.warehouseTable) return;

        const exportMenu = [
            {
                label: "📊 Eksportuj do CSV",
                action: () => this.warehouseTable.download("csv", "magazyn.csv")
            },
            {
                label: "📄 Eksportuj do JSON",
                action: () => {
                    const data = this.warehouseTable.getData().map(row => {
                        const { _id, _original, ...cleanRow } = row;
                        return cleanRow;
                    });
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'magazyn.json';
                    a.click();
                    URL.revokeObjectURL(url);
                }
            },
            {
                label: "📝 Eksportuj do TXT",
                action: () => {
                    const data = this.warehouseTable.getData().map(row => {
                        const { _id, _original, ...cleanRow } = row;
                        return cleanRow;
                    });
                    let text = "MAGAZYN - EKSPORT\n\n";
                    data.forEach((row, index) => {
                        text += `[${index + 1}] ${row.name}\n`;
                        text += `   Index: ${row.code}\n`;
                        text += `   Ilość: ${row.quantity}\n`;
                        text += `   Notatka: ${row.note || 'brak'}\n`;
                        text += "─".repeat(40) + "\n";
                    });

                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'magazyn.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                }
            },
            {
                label: "🖨️ Drukuj",
                action: () => this.warehouseTable.print()
            }
        ];

        const menu = document.createElement('div');
        menu.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 200px;
        `;

        exportMenu.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = `
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            `;
            div.textContent = item.label;
            div.onmouseover = () => div.style.background = '#f0f0f0';
            div.onmouseout = () => div.style.background = 'white';
            div.onclick = () => {
                item.action();
                document.body.removeChild(menu);
            };
            menu.appendChild(div);
        });

        const btn = document.getElementById('base_export');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            menu.style.top = (rect.bottom + 5) + 'px';
            menu.style.left = rect.left + 'px';
            document.body.appendChild(menu);

            setTimeout(() => {
                const closeMenu = (e) => {
                    if (!menu.contains(e.target) && e.target !== btn) {
                        document.body.removeChild(menu);
                        document.removeEventListener('click', closeMenu);
                    }
                };
                document.addEventListener('click', closeMenu);
            }, 100);
        }
    },

    toggleWarehouseSearch: function () {
        const searchContainer = document.getElementById('search-container');
        if (!searchContainer) return;

        const isVisible = searchContainer.style.display !== 'none';
        searchContainer.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.focus();
        }
    },

    applyWarehouseSearch: function () {
        if (!this.warehouseTable) return;

        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;

        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            this.warehouseTable.clearFilter();
            this.showWarehouseMessage("Wyszukiwanie wyczyszczone");
            return;
        }

        this.warehouseTable.setFilter([
            { field: "name", type: "like", value: searchTerm },
            { field: "code", type: "like", value: searchTerm },
            { field: "note", type: "like", value: searchTerm }
        ]);

        const filteredCount = this.warehouseTable.getData("active").length;
        this.showWarehouseMessage(`Znaleziono ${filteredCount} rekordów dla "${searchTerm}"`);
    },

    cancelWarehouseSearch: function () {
        const searchInput = document.getElementById('search-input');
        const searchContainer = document.getElementById('search-container');

        if (searchInput) searchInput.value = '';
        if (this.warehouseTable) this.warehouseTable.clearFilter();
        if (searchContainer) searchContainer.style.display = 'none';

        this.showWarehouseMessage("Wyszukiwanie anulowane");
    },

    refreshWarehouseData: async function () {
        try {
            this.showWarehouseMessage("🔄 Odświeżam dane...");
            const data = await getEndpointData("api/warehouse");
            this.warehouseOriginalData = data.data || [];
            this.warehouseCurrentData = this.warehouseOriginalData.map(row => ({
                ...row,
                _original: { ...row }
            }));
            this.warehouseEditedRows.clear();

            if (this.warehouseTable) {
                this.warehouseTable.setData(this.warehouseCurrentData);
            }

            this.showWarehouseMessage("✅ Dane odświeżone");
        } catch (error) {
            console.error("Błąd odświeżania danych:", error);
            this.showWarehouseError("Błąd podczas odświeżania danych");
        }
    },

    // POMOCNICZE METODY MAGAZYNU
    markWarehouseRowAsEdited: function (row) {
        const rowData = row.getData();
        if (!rowData._id) {
            rowData._id = 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            row.update({ _id: rowData._id });
        }
        this.warehouseEditedRows.add(rowData._id);
    },

    markWarehouseRowAsSaved: function (rowData) {
        this.warehouseEditedRows.delete(rowData._id);
    },

    getWarehouseEditedRows: function () {
        const editedRows = [];
        const allData = this.warehouseTable.getData();
        allData.forEach(rowData => {
            if (this.warehouseEditedRows.has(rowData._id)) {
                editedRows.push(rowData);
            }
        });
        return editedRows;
    },

    // FORMATTERY
    warehouseQuantityFormatter: function (cell, formatterParams, onRendered) {
        const value = cell.getValue();
        let style = "";
        let displayValue = value;

        if (value === null || value === undefined || value === '') {
            displayValue = '0';
            style = "color: red; font-weight: bold;";
        } else if (parseInt(value) <= 0) {
            style = "color: red; font-weight: bold;";
        } else if (parseInt(value) < 10) {
            style = "color: orange; font-weight: bold;";
        }

        return `<span style="${style}">${displayValue}</span>`;
    },

    warehouseActionsFormatter: function (cell, formatterParams, onRendered) {
        return `
            <div style="display: flex; gap: 5px; justify-content: center;">
                <button class="action-btn save-btn" title="Zapisz wiersz" style="background: none; border: 1px solid #ddd; border-radius: 3px; padding: 2px 5px; cursor: pointer; font-size: 12px;">💾</button>
                <button class="action-btn delete-btn" title="Usuń wiersz" style="background: none; border: 1px solid #ddd; border-radius: 3px; padding: 2px 5px; cursor: pointer; font-size: 12px;">🗑️</button>
            </div>
        `;
    },

    handleWarehouseActionClick: function (e, cell) {
        const row = cell.getRow();

        if (e.target.classList.contains('save-btn')) {
            this.saveWarehouseSingleRow(row);
        } else if (e.target.classList.contains('delete-btn')) {
            this.deleteWarehouseSingleRow(row);
        }
    },

    saveWarehouseSingleRow: async function (row) {
        try {
            const rowData = row.getData();
            console.log("Zapisywanie pojedynczego wiersza:", rowData);

            let result;
            if (rowData.id) {
                // Aktualizacja ilości
                result = await apiRequest(`/api/warehouse/${rowData.id}/quantity`, 'PUT', {
                    quantity: parseInt(rowData.quantity) || 0
                });
            } else {
                // Nowy rekord
                result = await apiRequest('/api/warehouse', 'POST', {
                    name: rowData.name,
                    code: rowData.code,
                    quantity: parseInt(rowData.quantity) || 0,
                    note: rowData.note || ''
                });

                if (result && result.success && result.id) {
                    row.update({ id: result.id });
                }
            }

            if (result && result.success) {
                this.markWarehouseRowAsSaved(rowData);
                this.showWarehouseMessage("✅ Wiersz zapisany");
            } else {
                throw new Error(result?.error || 'Błąd zapisu z API');
            }
        } catch (error) {
            console.error("Błąd zapisu wiersza:", error);
            this.showWarehouseError("Błąd zapisu wiersza: " + error.message);
        }
    },

    deleteWarehouseSingleRow: function (row) {
        if (!confirm("Czy na pewno chcesz usunąć ten wiersz?")) {
            return;
        }

        const rowData = row.getData();
        if (rowData._id) {
            this.warehouseEditedRows.delete(rowData._id);
        }

        // Jeśli wiersz ma ID, usuń z backendu
        if (rowData.id) {
            this.deleteWarehouseItemFromBackend(rowData.id);
        }

        row.delete().then(() => {
            this.showWarehouseMessage("🗑️ Wiersz usunięty");
        }).catch(error => {
            console.error("Błąd usuwania wiersza:", error);
            this.showWarehouseError("Błąd usuwania wiersza");
        });
    },

    getWarehouseContextMenu: function () {
        return [
            {
                label: "💾 Zapisz wiersz",
                action: (e, row) => this.saveWarehouseSingleRow(row)
            },
            {
                label: "🗑️ Usuń wiersz",
                action: (e, row) => this.deleteWarehouseSingleRow(row)
            }
        ];
    },

    // POWIADOMIENIA
    showWarehouseMessage: function (message) {
        console.log("📢 Magazyn:", message);
        // Proste powiadomienie
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 400px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 4000);
    },

    showWarehouseError: function (message) {
        console.error("❌ Magazyn:", message);
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 400px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 6000);
    }

};