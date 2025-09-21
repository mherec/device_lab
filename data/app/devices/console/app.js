appInitUpdate();

app = {
    ws: null, // <- ws przechowywane globalnie w obiekcie

    init: function () {
        // Jeśli istnieje stare połączenie, zamknij je na siłę
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            // addMessage('[System] Stare połączenie WebSocket zostało zamknięte', 'text-red-400');
        }

        // Tworzymy nowe połączenie
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
            const hexInput = document.getElementById('console-input-field');
            const hexData = hexInput.value.trim();

            if (hexData && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(hexData);
                // addMessage('[SENT] ' + hexData, 'sent');
                hexInput.value = '';
            }
        };

        document.getElementById('console-input-field').onkeypress = (e) => {
            if (e.key === 'Enter') sendHex();
        };

        document.getElementById('console-send-button').onclick = sendHex;
    }

};

// Funkcja wyświetlania wiadomości (przeniosłem poza init, żeby była globalna)
function addMessage(message, type) {
    const output = document.getElementById('console-messages');
    const div = document.createElement('div');
    div.className = type;
    div.textContent = new Date().toLocaleTimeString() + ' - ' + message;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
}

app.init();
