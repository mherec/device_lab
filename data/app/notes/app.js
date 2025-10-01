appInitUpdate();

app = {

    init: function () {
        this.initNotesManager();
        this.initTextEditor();
        this.setupGlobalFunctions();
    },

    initNotesManager: function () {
        class NotesManager {
            constructor() {
                this.notesList = document.getElementById('notesList');
                this.editorContainer = document.getElementById('editorContainer');
                this.noNoteSelected = document.getElementById('noNoteSelected');
                this.noteTitle = document.getElementById('noteTitle');
                this.saveNoteBtn = document.getElementById('saveNoteBtn');
                this.deleteNoteBtn = document.getElementById('deleteNoteBtn');
                this.closeEditorBtn = document.getElementById('closeEditorBtn');
                this.newNoteBtn = document.getElementById('newNoteBtn');

                this.currentNoteId = null;
                this.notes = [];

                this.init();
            }

            init() {
                this.setupEventListeners();
                this.loadNotes();
            }

            setupEventListeners() {
                this.saveNoteBtn.addEventListener('click', () => this.saveNote());
                this.deleteNoteBtn.addEventListener('click', () => this.deleteNote());
                this.closeEditorBtn.addEventListener('click', () => this.closeEditor());
                this.newNoteBtn.addEventListener('click', () => this.createNewNote());

                this.noteTitle.addEventListener('input', this.debounce(() => {
                    if (this.currentNoteId) {
                        this.saveNote();
                    }
                }, 1000));
            }

            async loadNotes() {
                this.showLoading();

                const result = await apiRequest('/api/notes');

                if (!result || !result.success) {
                    this.showError('Błąd ładowania notatek');
                    return;
                }

                this.notes = result.data || [];
                console.log('📝 Załadowane notatki:', this.notes);
                this.renderNotesList();
            }

            renderNotesList() {
                if (this.notes.length === 0) {
                    this.notesList.innerHTML = '<div class="empty-message">📝 Brak notatek<br><small>Kliknij "+ Nowa" aby utworzyć pierwszą notatkę</small></div>';
                    return;
                }

                this.notesList.innerHTML = '';

                this.notes.forEach(note => {
                    const noteElement = this.createNoteElement(note);
                    this.notesList.appendChild(noteElement);
                });
            }

            createNoteElement(note) {
                const div = document.createElement('div');
                div.className = `note-item ${this.currentNoteId === note.id ? 'active' : ''}`;

                // POPRAWIONE: Obsługa różnych struktur danych
                const noteTitle = note.title || note.name || `[${note.category}] Notatka` || 'Notatka';
                const noteContent = note.content || note.text || '';

                const preview = noteContent ?
                    this.stripHtml(noteContent).substring(0, 100) + (this.stripHtml(noteContent).length > 100 ? '...' : '') :
                    'Brak treści...';

                const badges = [];

                // POPRAWIONE: Obsługa różnych flag
                if (note.is_alert) badges.push('<span class="note-alert">⚠️ Alert</span>');
                if (note.is_planing) badges.push('<span class="note-planning">📅 Planowanie</span>');
                if (note.is_pinned) badges.push('<span class="note-pinned">📌 Przypięta</span>');

                // POPRAWIONE: Parsowanie tags z JSON string
                if (note.tags) {
                    try {
                        let tagsArray;
                        if (typeof note.tags === 'string') {
                            tagsArray = JSON.parse(note.tags);
                        } else if (Array.isArray(note.tags)) {
                            tagsArray = note.tags;
                        } else {
                            tagsArray = [];
                        }

                        if (tagsArray.length > 0) {
                            badges.push(`<span class="note-tags">🏷️ ${tagsArray.join(', ')}</span>`);
                        }
                    } catch (error) {
                        console.warn('Błąd parsowania tags:', error);
                        // Jeśli parsowanie się nie uda, traktuj jako pojedynczy tag
                        if (typeof note.tags === 'string') {
                            badges.push(`<span class="note-tags">🏷️ ${note.tags}</span>`);
                        }
                    }
                }

                div.innerHTML = `
                    <div class="note-title">${this.escapeHtml(noteTitle)}</div>
                    <div class="note-preview">${this.escapeHtml(preview)}</div>
                    <div class="note-meta">
                        <span>ID: ${note.id}</span>
                        <div>${badges.join(' ')}</div>
                    </div>
                `;

                div.addEventListener('click', () => this.openNote(note));

                return div;
            }

            openNote(note) {
                console.log('📖 Otwieranie notatki:', note);

                this.currentNoteId = note.id;

                // POPRAWIONE: Używamy właściwych pól z API
                this.noteTitle.value = note.title || note.name || note.category || 'notatka';

                const noteContent = note.content || note.text || '';
                if (window.textEditor) {
                    window.textEditor.setContent(noteContent);
                }

                this.showEditor();
                this.renderNotesList();
            }

            createNewNote() {
                this.currentNoteId = null;
                this.noteTitle.value = 'Nowa notatka';

                if (window.textEditor) {
                    window.textEditor.setContent('');
                }

                this.showEditor();

                setTimeout(() => {
                    this.noteTitle.focus();
                    this.noteTitle.select();
                }, 100);
            }

            async saveNote() {
                const name = this.noteTitle.value.trim();
                const text = window.textEditor ? window.textEditor.getContent() : '';

                if (!name) {
                    alert('Nazwa notatki nie może być pusta!');
                    return;
                }

                // POPRAWIONE: Używamy struktury zgodnej z API backendu
                const payload = {
                    name: name,
                    text: text,
                    is_alert: false,
                    is_planing: false,
                    alert_time: ''
                };

                console.log('💾 Wysyłanie danych:', payload);

                try {
                    let result;

                    if (this.currentNoteId) {
                        // Aktualizacja istniejącej notatki
                        result = await apiRequest(`/api/notes/${this.currentNoteId}`, 'PUT', payload);
                    } else {
                        // Tworzenie nowej notatki
                        result = await apiRequest('/api/notes', 'POST', payload);

                        if (result && result.success && result.id) {
                            this.currentNoteId = result.id;
                        }
                    }

                    if (result && result.success) {
                        this.showMessage('✅ Notatka zapisana!');
                        this.loadNotes();
                    } else {
                        throw new Error(result?.error || 'Nieznany błąd API');
                    }

                } catch (error) {
                    console.error('Błąd zapisywania notatki:', error);
                    this.showMessage('❌ Błąd zapisywania: ' + error.message);
                    // Możesz też zachować fallback jeśli chcesz
                    // this.saveNoteFallback(name, text, error.message);
                }
            }

            // Fallback - zapisz lokalnie w localStorage
            saveNoteFallback(name, text, apiError) {
                console.log('🔄 Używam fallback do zapisu lokalnego');

                const noteData = {
                    id: this.currentNoteId || Date.now(),
                    name: name,
                    text: text,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_pinned: 0,
                    is_alert: 0,
                    is_planing: 0,
                    tags: JSON.stringify(['notatka', 'lokalna'])
                };

                // Zapisz w localStorage
                const localNotes = JSON.parse(localStorage.getItem('localNotes') || '{}');
                localNotes[noteData.id] = noteData;
                localStorage.setItem('localNotes', JSON.stringify(localNotes));

                this.showMessage('💾 Zapisano lokalnie');
                console.log('API Error:', apiError);

                // Odśwież listę z lokalnymi danymi
                this.loadLocalNotes();
            }

            // Załaduj notatki z localStorage
            loadLocalNotes() {
                const localNotes = JSON.parse(localStorage.getItem('localNotes') || '{}');
                const apiNotes = this.notes.filter(note => {
                    if (note.tags && typeof note.tags === 'string') {
                        try {
                            const tags = JSON.parse(note.tags);
                            return !tags.includes('lokalna');
                        } catch (e) {
                            return true;
                        }
                    }
                    return true;
                });
                this.notes = [...apiNotes, ...Object.values(localNotes)];
                this.renderNotesList();
            }

            async deleteNote() {
                if (!this.currentNoteId) {
                    alert('Nie wybrano notatki do usunięcia!');
                    return;
                }

                if (!confirm('Czy na pewno chcesz usunąć tę notatkę? Tej operacji nie można cofnąć.')) {
                    return;
                }

                try {
                    // Sprawdź czy to notatka lokalna
                    const localNotes = JSON.parse(localStorage.getItem('localNotes') || '{}');
                    if (localNotes[this.currentNoteId]) {
                        // Usuń lokalną notatkę
                        this.deleteNoteFallback();
                    } else {
                        // Spróbuj usunąć przez API
                        const result = await apiRequest(`/api/notes/${this.currentNoteId}`, 'DELETE');

                        if (result && result.success) {
                            this.showMessage('🗑️ Notatka usunięta z API!');
                        } else {
                            throw new Error('API nie mogło usunąć notatki');
                        }
                    }

                    this.closeEditor();
                    this.loadNotes();

                } catch (error) {
                    console.error('Błąd usuwania notatki:', error);
                    this.deleteNoteFallback();
                }
            }

            deleteNoteFallback() {
                const localNotes = JSON.parse(localStorage.getItem('localNotes') || '{}');
                delete localNotes[this.currentNoteId];
                localStorage.setItem('localNotes', JSON.stringify(localNotes));
                this.showMessage('🗑️ Notatka usunięta lokalnie');
            }

            closeEditor() {
                this.editorContainer.style.display = 'none';
                this.noNoteSelected.style.display = 'flex';
                this.currentNoteId = null;
                this.renderNotesList();
            }

            showEditor() {
                this.noNoteSelected.style.display = 'none';
                this.editorContainer.style.display = 'flex';
            }

            showLoading() {
                this.notesList.innerHTML = '<div class="loading">⌛ Ładowanie notatek...</div>';
            }

            showError(message) {
                this.notesList.innerHTML = `<div class="error">❌ ${message}</div>`;
            }

            showMessage(message) {
                const alert = document.createElement('div');
                alert.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #27ae60;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 6px;
                    z-index: 1000;
                    animation: slideInRight 0.3s ease-out;
                `;
                alert.textContent = message;
                document.body.appendChild(alert);

                setTimeout(() => {
                    alert.remove();
                }, 3000);
            }

            escapeHtml(unsafe) {
                if (unsafe === null || unsafe === undefined) {
                    return '';
                }
                const safeString = String(unsafe);
                return safeString
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            stripHtml(html) {
                if (!html) return '';
                const safeHtml = String(html);
                return safeHtml.replace(/<[^>]*>/g, '');
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

        // Inicjalizacja managera notatek
        window.notesManager = new NotesManager();
    },

    initTextEditor: function () {
        class TextEditor {
            constructor(editorId) {
                this.editor = document.getElementById(editorId);
                this.supportsExecCommand = !!document.execCommand;
                this.init();
            }

            init() {
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
                            case 's':
                                e.preventDefault();
                                if (window.notesManager) {
                                    window.notesManager.saveNote();
                                }
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
                // Auto-save można dodać tutaj
                if (window.notesManager && window.notesManager.currentNoteId) {
                    // Opcjonalne auto-save przy zmianie treści
                }
            }

            addLink() {
                const url = prompt('Wpisz URL:');
                if (url) {
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
                if (!this.supportsExecCommand) {
                    const selection = window.getSelection();
                    if (selection.toString()) {
                        const range = selection.getRangeAt(0);
                        const textNode = document.createTextNode(selection.toString());
                        range.deleteContents();
                        range.insertNode(textNode);

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
        window.textEditor = new TextEditor('textEditor');
    },

    setupGlobalFunctions: function () {
        // Funkcje globalne dla kompatybilności z HTML
        window.execCmd = function (command) {
            if (window.textEditor) {
                window.textEditor.execCmd(command);
            }
        };

        window.execCmdWithValue = function (command, value) {
            if (window.textEditor) {
                window.textEditor.execCmdWithValue(command, value);
            }
        };

        window.addLink = function () {
            if (window.textEditor) {
                window.textEditor.addLink();
            }
        };

        window.setFontSize = function (size) {
            if (window.textEditor) {
                window.textEditor.setFontSize(size);
            }
        };

        window.setHeading = function (heading) {
            if (window.textEditor) {
                window.textEditor.setHeading(heading);
            }
        };

        window.removeFormat = function () {
            if (window.textEditor) {
                window.textEditor.removeFormat();
            }
        };
    }

};