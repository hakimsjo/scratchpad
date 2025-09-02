document.addEventListener('DOMContentLoaded', () => {
    const noteForm = document.getElementById('note-form');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentInput = document.getElementById('note-content-input');
    const noteList = document.getElementById('note-list');
    const deleteAllBtn = document.getElementById('delete-all-btn');
    const emptyListMessage = document.getElementById('empty-list-message');
    const submitBtn = noteForm.querySelector('button[type="submit"]');
    const searchInput = document.getElementById('search-input');

    const BTN_TEXT_SAVE = '<i class="bi bi-save-fill me-2"></i>Save Note';
    const BTN_TEXT_UPDATE = '<i class="bi bi-pencil-fill me-2"></i>Update Note';

    // Migrate old notes to the new format
    const migrateOldNotes = (notes) => {
        return notes.map(note => {
            if (note.text && typeof note.title === 'undefined') {
                return { id: note.id, title: note.text, content: '' };
            }
            return note;
        });
    };

    let notes = migrateOldNotes(JSON.parse(localStorage.getItem('notes')) || []);
    let editingNoteId = null;

    const saveNotes = () => {
        localStorage.setItem('notes', JSON.stringify(notes));
    };

    const renderNotes = (notesToRender = notes) => {
        noteList.innerHTML = '';
        if (notesToRender.length === 0) {
            emptyListMessage.classList.remove('d-none');
            deleteAllBtn.classList.add('d-none');
        } else {
            emptyListMessage.classList.add('d-none');
            deleteAllBtn.classList.remove('d-none');
        }

        notesToRender.forEach(note => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-start';
            li.dataset.id = note.id;

            const noteContentDiv = document.createElement('div');
            const noteTitle = document.createElement('h6');
            noteTitle.textContent = note.title;
            noteTitle.className = 'fw-bold';

            const noteContent = document.createElement('p');
            noteContent.textContent = note.content;
            noteContent.className = 'note-content mb-0';

            noteContentDiv.appendChild(noteTitle);
            if (note.content) {
                noteContentDiv.appendChild(noteContent);
            }

            const btnGroup = document.createElement('div');
            btnGroup.className = 'btn-group ms-2';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-sm btn-outline-secondary';
            editBtn.innerHTML = '<i class="bi bi-pencil-fill"></i>';
            editBtn.onclick = () => startEditing(note.id, note.title, note.content);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger';
            deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i>';
            deleteBtn.onclick = () => deleteNote(note.id);

            btnGroup.appendChild(editBtn);
            btnGroup.appendChild(deleteBtn);
            li.appendChild(noteContentDiv);
            li.appendChild(btnGroup);
            noteList.appendChild(li);
        });
    };

    const addNote = (title, content) => {
        const newNote = {
            id: Date.now(),
            title: title,
            content: content
        };
        notes.push(newNote);
        saveNotes();
        renderNotes();
    };

    const updateNote = (id, newTitle, newContent) => {
        const noteToUpdate = notes.find(note => note.id === id);
        if (noteToUpdate) {
            noteToUpdate.title = newTitle;
            noteToUpdate.content = newContent;
        }
        saveNotes();
        renderNotes();
    };

    const deleteNote = (id) => {
        if (confirm('Are you sure you want to delete this note?')) {
            notes = notes.filter(note => note.id !== id);
            saveNotes();
            renderNotes();
        }
    };

    const startEditing = (id, currentTitle, currentContent) => {
        noteTitleInput.value = currentTitle;
        noteContentInput.value = currentContent;
        noteTitleInput.focus();
        submitBtn.innerHTML = BTN_TEXT_UPDATE;
        editingNoteId = id;
    };

    noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();
        if (title === '') return;

        if (editingNoteId !== null) {
            updateNote(editingNoteId, title, content);
            editingNoteId = null;
            submitBtn.innerHTML = BTN_TEXT_SAVE;
        } else {
            addNote(title, content);
        }

        noteForm.reset();
        noteTitleInput.focus(); // Set focus back to the title field
    });

    deleteAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete ALL notes? This cannot be undone.')) {
            notes = [];
            saveNotes();
            renderNotes();
        }
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)
        );
        renderNotes(filteredNotes);
    });

    // --- Theme Switcher Logic ---
    const getPreferredTheme = () => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            return storedTheme;
        }
        return 'auto';
    };

    const setTheme = theme => {
        let effectiveTheme = theme;
        if (theme === 'auto') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
    };

    const updateThemeIcon = (theme) => {
        const themeIcon = document.querySelector('.theme-icon-active');
        const iconMap = {
            'light': 'bi-sun-fill',
            'dark': 'bi-moon-stars-fill',
            'auto': 'bi-circle-half'
        };
        themeIcon.className = `bi ${iconMap[theme]} theme-icon-active`;
    };

    const initialTheme = getPreferredTheme();
    setTheme(initialTheme);
    updateThemeIcon(initialTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getPreferredTheme() === 'auto') {
            setTheme('auto');
        }
    });

    document.querySelectorAll('[data-bs-theme-value]').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const theme = toggle.getAttribute('data-bs-theme-value');
            localStorage.setItem('theme', theme);
            setTheme(theme);
            updateThemeIcon(theme);
        });
    });

    // --- Collapse list logic ---
    const toggleListBtn = document.getElementById('toggle-list-btn');
    if (toggleListBtn) {
        const collapsibleElement = document.getElementById('collapsible-note-list');
        const toggleIcon = toggleListBtn.querySelector('i');

        collapsibleElement.addEventListener('show.bs.collapse', () => {
            toggleIcon.className = 'bi bi-chevron-up';
            toggleListBtn.title = 'Collapse list';
        });

        collapsibleElement.addEventListener('hide.bs.collapse', () => {
            toggleIcon.className = 'bi bi-chevron-down';
            toggleListBtn.title = 'Expand list';
        });
    }

    // Initial render
    saveNotes(); // Save notes after potential migration
    renderNotes();
});
