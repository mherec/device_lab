// lightweight interactions: activate nav link on click
document.querySelectorAll('.nav a').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.nav a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
    })
})

// keyboard shortcut for search focus: Ctrl+K
window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.querySelector('.search-bar input');
        input.focus();
        input.select();
    }
})
let realTimeClockObject = null;
if (document.getElementById('_time')) {
    realTimeClockObject = document.getElementById('_time')
    setInterval(() => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        realTimeClockObject.innerHTML = `${hours}:${minutes}:${seconds}`;
    }, 1000)
}