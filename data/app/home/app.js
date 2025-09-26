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
        setTimeout(() => {
            if (alertsTab) {
                alertsTab.classList.add('active');

            }
        }, 1000)
    }
}
