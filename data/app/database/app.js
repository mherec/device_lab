appInitUpdate();

app = {

    init: function () {

        let clearTable200 = [];

        for (let i = 0; i < 400; i++) {
            clearTable200.push({ name: '', code: '', quantity: '', note: '' });
        }

        try {


            getEndpointData("api/warehouse").then(data => {

                const table = new Tabulator("#ware-table", {
                    height: "800px",
                    layout: "fitColumns",
                    columns: [
                        { title: "Nazwa", field: "name", editor: "input" },
                        { title: "Index", field: "code", editor: "input" },
                        { title: "Ilość", field: "quantity", editor: "number" },
                        { title: "Notatka", field: "note", editor: "input" },
                    ],
                    data: [
                        // ...data.data 
                        ...clearTable200
                    ],
                });

            }
            );
        } catch (e) {
            console.log("error database")
        }
    }
};

