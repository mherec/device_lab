class TextEditor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.init();
    }

    init() {
        // Sprawdź czy execCommand jest dostępne
        this.supportsExecCommand = !!document.execCommand;

        if (!this.supportsExecCommand) {
            console.warn('execCommand nie jest wspierane, używam fallback methods');
        }

        this.editor.focus();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.editor.addEventListener('input', this.debounce(() => {
            this.onContentChange();
        }, 300));

        // Obsługa skrótów klawiaturowych
        this.editor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.execCmd('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.execCmd('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.execCmd('underline');
                        break;
                }
            }
        });
    }

    execCmd(command, value = null) {
        try {
            if (this.supportsExecCommand) {
                const success = document.execCommand(command, false, value);
                if (!success) {
                    this.fallbackCommand(command, value);
                }
            } else {
                this.fallbackCommand(command, value);
            }
            this.editor.focus();
        } catch (error) {
            console.warn(`Command ${command} failed:`, error);
            this.fallbackCommand(command, value);
        }
    }

    fallbackCommand(command, value) {
        const selection = window.getSelection();
        if (!selection.toString() && !['formatBlock', 'insertHTML'].includes(command)) {
            return;
        }

        try {
            switch (command) {
                case 'bold':
                    this.wrapSelection('<strong>', '</strong>');
                    break;
                case 'italic':
                    this.wrapSelection('<em>', '</em>');
                    break;
                case 'underline':
                    this.wrapSelection('<span style="text-decoration: underline">', '</span>');
                    break;
                case 'strikeThrough':
                    this.wrapSelection('<s>', '</s>');
                    break;
                case 'foreColor':
                    this.wrapSelection(`<span style="color: ${value}">`, '</span>');
                    break;
                case 'hiliteColor':
                    this.wrapSelection(`<span style="background-color: ${value}">`, '</span>');
                    break;
                case 'formatBlock':
                    this.wrapSelection(`<${value}>`, `</${value}>`);
                    break;
                case 'createLink':
                    this.wrapSelection(`<a href="${value}" target="_blank">`, '</a>');
                    break;
                case 'insertUnorderedList':
                    this.insertList('ul');
                    break;
                case 'insertOrderedList':
                    this.insertList('ol');
                    break;
                case 'justifyLeft':
                    this.wrapSelection('<div style="text-align: left">', '</div>');
                    break;
                case 'justifyCenter':
                    this.wrapSelection('<div style="text-align: center">', '</div>');
                    break;
                case 'justifyRight':
                    this.wrapSelection('<div style="text-align: right">', '</div>');
                    break;
                default:
                    console.warn(`Fallback for command ${command} not implemented`);
            }
        } catch (error) {
            console.error('Fallback command failed:', error);
        }
    }

    wrapSelection(startTag, endTag) {
        const selection = window.getSelection();
        if (!selection.toString()) return;

        const range = selection.getRangeAt(0);
        const selectedContent = range.extractContents();
        const wrapper = document.createElement('div');

        wrapper.innerHTML = startTag + selectedContent.textContent + endTag;
        const newContent = wrapper.firstChild;

        range.insertNode(newContent);
        selection.removeAllRanges();

        // Ustaw selekcję na nowo wstawiony content
        const newRange = document.createRange();
        newRange.selectNodeContents(newContent);
        selection.addRange(newRange);
    }

    insertList(type) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        const list = document.createElement(type);
        const listItem = document.createElement('li');

        if (selection.toString()) {
            listItem.textContent = selection.toString();
            range.deleteContents();
        } else {
            listItem.textContent = 'Element listy';
        }

        list.appendChild(listItem);
        range.insertNode(list);

        // Ustaw selekcję w liście
        const newRange = document.createRange();
        newRange.setStart(listItem, 0);
        newRange.setEnd(listItem, 0);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }

    execCmdWithValue(command, value) {
        if (value) {
            this.execCmd(command, value);
        }
    }

    onContentChange() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            try {
                const element = selection.getRangeAt(0).startContainer.parentElement;
                console.log('Aktualny styl:', {
                    fontSize: element.style.fontSize,
                    fontWeight: element.style.fontWeight,
                    color: element.style.color,
                    backgroundColor: element.style.backgroundColor
                });
            } catch (error) {
                // Ignoruj błędy przy pustej selekcji
            }
        }
    }

    addLink() {
        const url = prompt('Wpisz URL:');
        if (url) {
            // Walidacja URL
            const validUrl = url.startsWith('http') ? url : `https://${url}`;
            this.execCmd('createLink', validUrl);
        }
    }

    setFontSize(size) {
        if (size) {
            if (this.supportsExecCommand) {
                document.execCommand('fontSize', false, '7');
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('fontSize', false, size);
            } else {
                this.wrapSelection(`<span style="font-size: ${size}">`, '</span>');
            }
            this.editor.focus();
        }
    }

    setHeading(heading) {
        if (heading) {
            this.execCmd('formatBlock', `<${heading}>`);
        }
    }

    removeFormat() {
        this.execCmd('removeFormat');
        // Dodatkowe czyszczenie dla fallback
        if (!this.supportsExecCommand) {
            const selection = window.getSelection();
            if (selection.toString()) {
                const range = selection.getRangeAt(0);
                const textNode = document.createTextNode(selection.toString());
                range.deleteContents();
                range.insertNode(textNode);

                // Ustaw selekcję na czysty tekst
                const newRange = document.createRange();
                newRange.selectNodeContents(textNode);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }
    }

    getContent() {
        return this.editor.innerHTML;
    }

    setContent(html) {
        this.editor.innerHTML = html;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Inicjalizacja edytora
const textEditor = new TextEditor('textEditor');

// Zachowaj oryginalne nazwy funkcji dla kompatybilności
function execCmd(command) {
    textEditor.execCmd(command);
}

function execCmdWithValue(command, value) {
    textEditor.execCmdWithValue(command, value);
}

function addLink() {
    textEditor.addLink();
}

function setFontSize(size) {
    textEditor.setFontSize(size);
}

function setHeading(heading) {
    textEditor.setHeading(heading);
}

function removeFormat() {
    textEditor.removeFormat();
}

// Fokus na start
document.getElementById('textEditor').focus();