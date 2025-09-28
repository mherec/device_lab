appInitUpdate();

app = {
    ws: null,

    init: function () {

        const consoleElement = document.getElementById('console-input-field');
        const clearButton = document.getElementById('clear-console-button');
        clearButton.onclick = () => {
            const output = document.getElementById('console-messages');
            output.innerHTML = '';
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            // addMessage('[System] Stare połączenie WebSocket zostało zamknięte', 'text-red-400');
        }
        this.ws = new WebSocket('ws://control.local:81/');

        this.ws.onopen = () => {
            addMessage('[System] Connected to WebSocket', 'text-blue-700');
        };

        this.ws.onmessage = (event) => {
            addMessage(event.data, 'text-white');
        };

        this.ws.onclose = () => {
            addMessage('[System] WebSocket disconnected', 'text-red-400');
        };

        const sendHex = () => {
            const hexInput = consoleElement;
            const hexData = hexInput.value.trim();

            if (hexData && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(hexData);
                hexInput.value = '';
            }
        };

        consoleElement.keyup = (e) => {
            if (e.key === 'Enter') sendHex();
        };

        document.getElementById('console-send-button').onclick = sendHex;


        function addMessage(message, type) {
            const output = document.getElementById('console-messages');
            const div = document.createElement('div');
            div.className = type;
            div.textContent = new Date().toLocaleTimeString() + ' - ' + message;
            output.appendChild(div);
            output.scrollTop = output.scrollHeight;
        }

        const menuOptionsObiect = {
            'Ulubione': {
                'Ustaw Podlicznik ID z 1 na 100': '011010030001020064b649',
                'Ustaw Modbus RTU 4CH ID 200': '',
                'Ustaw Kontroler DS18B20 ID z 1 na 150': '010600FE00966854',
                'Włącz kaseton': '',
                'Odczytaj stan licznika ID 150': '6403012200026c08',
                'Odczytaj temperature CH1 ID 150': '96030000000198ED'
            },
            'Odczytaj ID': {
                'Modbus RTU Relay_': '010300000002C40B',
                'Licznik energii': '010300000002C40B',
                'Kontroler odczytu temperatury': '010300000002C40B',
                'Moduł Kontroli Carel': '010300000002C40B'
            },
            'Zmień ID': {
                'Modbus RTU Relay': '0106000000010001F9F8',
                'Licznik energii': '0106000000010001F9F8',
                'Kontroler odczytu temperatury': '0106000000010001F9F8',
                'Moduł Kontroli Carel': '0106000000010001F9F8'
            },
        }
        function generateMenuTable(menuObject, parentElement) {
            parentElement.innerHTML = '';
            parentElement.style.display = 'flex';
            parentElement.style.flexWrap = 'wrap';
            parentElement.style.gap = '10px';
            parentElement.style.padding = '10px';
            parentElement.style.borderRadius = '8px';
            parentElement.style.fontFamily = 'sans-serif';

            for (const key in menuObject) {
                const menuItem = document.createElement('div');
                menuItem.style.position = 'relative';

                const button = document.createElement('button');
                button.style.backgroundColor = '#4a5568';
                button.style.color = 'white';
                button.style.border = 'none';
                button.style.padding = '10px 15px';
                button.style.borderRadius = '6px';
                button.style.cursor = 'pointer';
                button.style.transition = 'background-color 0.2s';
                button.style.fontWeight = '500';
                button.style.whiteSpace = 'nowrap';

                button.textContent = key;
                menuItem.appendChild(button);

                if (typeof menuObject[key] === 'object') {
                    const subMenu = document.createElement('div');
                    subMenu.style.position = 'absolute';
                    subMenu.style.top = '100%';
                    subMenu.style.left = '0';
                    subMenu.style.backgroundColor = 'white';
                    subMenu.style.borderRadius = '6px';
                    subMenu.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                    subMenu.style.minWidth = '200px';
                    subMenu.style.zIndex = '50';
                    subMenu.style.padding = '8px';
                    subMenu.style.display = 'none'; // DOMYŚLNIE UKRYTE
                    subMenu.style.flexDirection = 'column';
                    subMenu.style.gap = '5px';

                    menuItem.appendChild(subMenu);

                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.submenu').forEach(item => {
                            if (item !== subMenu && item.style.display === 'flex') {
                                item.style.display = 'none';
                            }
                        });
                        if (subMenu.style.display === 'none' || subMenu.style.display === '') {
                            subMenu.style.display = 'flex';
                        } else {
                            subMenu.style.display = 'none';
                        }
                    });

                    generateMenuTable(menuObject[key], subMenu);
                    subMenu.classList.add('submenu');
                } else {
                    button.addEventListener('click', () => {
                        if (app.ws && app.ws.readyState === WebSocket.OPEN) {
                            app.ws.send(menuObject[key]);
                            addMessage('[SENT] ' + menuObject[key], 'sent');

                            document.querySelectorAll('.submenu').forEach(item => {
                                item.style.display = 'none';
                            });
                        } else {
                            addMessage('[ERROR] WebSocket is not connected', 'text-red-400');
                        }
                    });
                }
                button.addEventListener('mouseenter', () => {
                    button.style.backgroundColor = '#2d3748';
                });

                button.addEventListener('mouseleave', () => {
                    button.style.backgroundColor = '#4a5568';
                });

                parentElement.appendChild(menuItem);
            }
            document.addEventListener('click', (e) => {
                if (!parentElement.contains(e.target)) {
                    document.querySelectorAll('.submenu').forEach(item => {
                        item.style.display = 'none';
                    });
                }
            });
        }

        function hideAllSubmenus() {
            document.querySelectorAll('.submenu').forEach(item => {
                item.style.display = 'none';
            });
        }

        document.addEventListener('DOMContentLoaded', hideAllSubmenus);

        const tableCommandElement = document.getElementById('table-command');
        generateMenuTable(menuOptionsObiect, tableCommandElement);


        hideAllSubmenus();

    }


};

