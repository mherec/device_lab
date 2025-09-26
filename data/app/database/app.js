appInitUpdate();

app = {

    init: function () {


        const table = new Tabulator("#example-table", {
            height: "600px",
            layout: "fitColumns",
            columns: [
                { title: "Nazwa", field: "name", editor: "input" },
                { title: "Index", field: "index", editor: "input" },
                { title: "Ilość", field: "pcs", editor: "number" },
                { title: "Notatka", field: "info", editor: "input" },
            ],
            data: [
                ...memory.equ
            ],
        });

    }
};

