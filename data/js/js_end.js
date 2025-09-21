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
