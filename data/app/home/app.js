appInitUpdate();

app = {

    init: function () {

        document.querySelectorAll('._dashboard-tab-header').forEach(header => {
            header.addEventListener('click', function () {
                const tab = this.parentElement;
                const isActive = tab.classList.contains('active');

                if (isActive) {
                    tab.classList.remove('active');
                } else {
                    document.querySelectorAll('._dashboard-tab').forEach(t => {
                        t.classList.remove('active');
                    });
                    tab.classList.add('active');
                }
            });
        });

        const alertsTab = document.querySelector('._dashboard-tab-alerts');

        window.dashboardUnreadAlert = function (id) {
            document.getElementById("alerty").innerHTML = `<div class="_dashboard-tab-loader"></div>`;
            apiRequest(`/api/alerts/${id}/read`, "POST", { read: 1 });
            setTimeout(() => {
                dashboardReadAlerts();
            }, 1000)
        }

        function renderMessages(messages, containerId) {
            const container = document.getElementById(containerId);
            container.innerHTML = "";
            let alertCounter = 0;
            messages.forEach(msg => {
                if (msg.is_read === 0) {
                    alertCounter++;
                    let priority;
                    const div = document.createElement("div");
                    div.classList.add("message");
                    switch (msg.priority) {
                        case 1:
                            priority = "dashboard-alert-regular"
                            break;
                        case 2:
                            priority = "dashboard-alert-error"
                            break;
                        default:
                            priority = "dashboard-alert-regular"
                            break;
                    }

                    div.innerHTML = `  
            <div class="dashboard-alert ${priority}">
            <button onClick="dashboardUnreadAlert(${msg.id})" class="dashboard-alert-close">x</button>
            <span><span class="dashboard-title">${msg.title}</span> 
            <p> ${msg.message}</p><span class="dashboard-alert-time">${msg.created_at}</span></span>
            </div>
                    `;
                    container.appendChild(div);
                }
            });
            if (alertCounter === 0) {
                const nothingDiv = document.createElement("div");
                nothingDiv.innerHTML = `<div class="dashboard-alert dashboadr-alert-nothing">Nic do wyświetlenia</div>`;
                container.appendChild(nothingDiv);
                document.getElementById("alerts_counter").innerText = "0";
                document.getElementById("alerts_counter").classList.add('hidden');
            } else {
                alertsTab.classList.add('active');

                document.getElementById("alerts_counter").innerText = alertCounter;
                document.getElementById("alerts_counter").classList.remove('hidden');
            }
        }

        window.dashboardReadAlerts = function () {
            getEndpointData("api/alerts").then(data => {
                renderMessages(data.data, "alerty");

            });
        }


        dashboardReadAlerts();

    }



}
