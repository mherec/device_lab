appInitUpdate();

app = {
    init: function () {
        let modbusControllerStatus

        document.getElementById('statusButton') ? modbusControllerStatus = document.getElementById('statusButton') : null;
        if (!modbusControllerStatus) return;


        function updateStatusModbusController() {

            fetch('http://control.local/ping', {
                mode: 'no-cors',
                headers: {
                    'Accept': 'application/json',
                }
            })
                .then(response => {
                    if (response.type === 'opaque') {
                        // Request doszedł, ale nie możemy przeczytać odpowiedzi
                        modbusControllerStatus.classList.remove('bg-red-500');
                        modbusControllerStatus.classList.add('bg-green-500');
                        modbusControllerStatus.innerText = 'Online';
                    } else {
                        modbusControllerStatus.classList.remove('bg-green-500');
                        modbusControllerStatus.classList.add('bg-red-500');
                        modbusControllerStatus.innerText = 'Offline';
                    }
                })
                .catch(error => {
                    modbusControllerStatus.classList.remove('bg-green-500');
                    modbusControllerStatus.classList.add('bg-red-500');
                    modbusControllerStatus.innerText = 'Offline';
                    console.error('Błąd:', error);
                });
        }

        updateStatusModbusController();

    }
};

