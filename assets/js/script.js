document.addEventListener('DOMContentLoaded', () => {
    const noteForm = document.getElementById('note-form');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentInput = document.getElementById('note-content-input');
    const noteList = document.getElementById('note-list');
    const newNoteBtn = document.getElementById('new-note-btn');
    const deleteAllBtn = document.getElementById('delete-all-btn');
    const emptyListMessage = document.getElementById('empty-list-message');
    const saveNowBtn = document.getElementById('save-note-btn');
    const searchInput = document.getElementById('search-input');
    const notesListPanel = document.getElementById('notes-list-panel');
    const editorPanel = document.getElementById('editor-panel');
    const openNotesTabs = document.getElementById('open-notes-tabs');
    const activeNoteCloseBtn = document.getElementById('active-note-close-btn');
    const autosaveStatus = document.getElementById('autosave-status');

    const AUTOSAVE_DELAY_MS = 30000;

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
    let openTabs = [];
    let activeTabId = null;
    let autosaveTimerId = null;
    let currentSearchTerm = '';

    const saveNotes = () => {
        localStorage.setItem('notes', JSON.stringify(notes));
    };

    const setAutosaveStatus = (text) => {
        autosaveStatus.textContent = text;
    };

    const getActiveTab = () => {
        return openTabs.find(tab => tab.id === activeTabId) || null;
    };

    const getNoteById = (id) => {
        return notes.find(note => note.id === id) || null;
    };

    const truncateTitle = (title) => {
        const trimmed = (title || '').trim();
        if (!trimmed) {
            return 'Untitled';
        }
        return trimmed.length > 26 ? `${trimmed.slice(0, 26)}...` : trimmed;
    };

    const getSaveTimestamp = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const clearAutosaveTimer = () => {
        if (autosaveTimerId) {
            clearTimeout(autosaveTimerId);
            autosaveTimerId = null;
        }
    };

    const renderEditor = () => {
        const activeTab = getActiveTab();
        if (!activeTab) {
            editorPanel.classList.add('d-none');
            notesListPanel.classList.remove('d-none');
            noteForm.reset();
            return;
        }

        editorPanel.classList.remove('d-none');
        notesListPanel.classList.add('d-none');
        noteTitleInput.value = activeTab.title;
        noteContentInput.value = activeTab.content;
        noteTitleInput.focus();
    };

    const renderTabs = () => {
        openNotesTabs.innerHTML = '';

        openTabs.forEach(tab => {
            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item open-tab-item';

            const tabButton = document.createElement('button');
            tabButton.type = 'button';
            tabButton.className = `nav-link ${tab.id === activeTabId ? 'active' : ''}`;
            tabButton.textContent = `${truncateTitle(tab.title)}${tab.dirty ? ' *' : ''}`;
            tabButton.addEventListener('click', () => {
                activeTabId = tab.id;
                renderTabs();
                renderEditor();
                setAutosaveStatus(tab.dirty ? 'Autosave in 30s...' : 'Autosave: idle');
            });

            tabItem.appendChild(tabButton);
            openNotesTabs.appendChild(tabItem);
        });

        if (activeTabId) {
            activeNoteCloseBtn.classList.remove('d-none');
        } else {
            activeNoteCloseBtn.classList.add('d-none');
        }
    };

    const closeTab = (tabId) => {
        const tabToClose = openTabs.find(openTab => openTab.id === tabId);
        if (tabToClose && tabToClose.dirty) {
            persistTab(tabToClose, false);
        }

        openTabs = openTabs.filter(openTab => openTab.id !== tabId);

        if (activeTabId === tabId) {
            activeTabId = openTabs.length > 0 ? openTabs[0].id : null;
        }

        renderTabs();
        renderEditor();
        clearAutosaveTimer();
        setAutosaveStatus(activeTabId ? 'Autosave: idle' : 'Open a note to start editing');
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

            const noteContentDiv = document.createElement('button');
            noteContentDiv.type = 'button';
            noteContentDiv.className = 'note-open-btn';
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

            noteContentDiv.addEventListener('click', () => {
                const existingTab = openTabs.find(tab => tab.id === note.id);
                if (!existingTab) {
                    openTabs.unshift({
                        id: note.id,
                        title: note.title,
                        content: note.content,
                        isDraft: false,
                        dirty: false
                    });
                }

                activeTabId = note.id;
                renderTabs();
                renderEditor();
                clearAutosaveTimer();
                setAutosaveStatus('Autosave: idle');
            });

            const btnGroup = document.createElement('div');
            btnGroup.className = 'btn-group ms-2';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger';
            deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i>';
            deleteBtn.addEventListener('click', () => {
                notes = notes.filter(existingNote => existingNote.id !== note.id);
                openTabs = openTabs.filter(tab => tab.id !== note.id);

                if (activeTabId === note.id) {
                    activeTabId = openTabs.length > 0 ? openTabs[0].id : null;
                }

                saveNotes();
                renderNotes(notes.filter(candidate =>
                    candidate.title.toLowerCase().includes(currentSearchTerm) ||
                    candidate.content.toLowerCase().includes(currentSearchTerm)
                ));
                renderTabs();
                renderEditor();
            });

            btnGroup.appendChild(deleteBtn);
            li.appendChild(noteContentDiv);
            li.appendChild(btnGroup);
            noteList.appendChild(li);
        });
    };

    const renderFilteredNotes = () => {
        const filteredNotes = notes.filter(note =>
            note.title.toLowerCase().includes(currentSearchTerm) ||
            note.content.toLowerCase().includes(currentSearchTerm)
        );
        renderNotes(filteredNotes);
    };

    const persistTab = (tab, fromAutosave) => {
        if (!tab) {
            return;
        }

        const title = tab.title.trim();
        const content = tab.content.trim();

        if (tab.isDraft && !title && !content) {
            tab.dirty = false;
            renderTabs();
            setAutosaveStatus('Draft is empty, nothing to save');
            return;
        }

        if (tab.isDraft) {
            const newNote = {
                id: Date.now(),
                title,
                content
            };

            const previousDraftId = tab.id;
            tab.id = newNote.id;
            tab.isDraft = false;
            tab.title = newNote.title;
            tab.content = newNote.content;
            activeTabId = newNote.id;
            notes.unshift(newNote);

            openTabs.forEach(openTab => {
                if (openTab.id === previousDraftId) {
                    openTab.id = newNote.id;
                    openTab.isDraft = false;
                }
            });
        } else {
            const noteToUpdate = getNoteById(tab.id);
            if (noteToUpdate) {
                noteToUpdate.title = title;
                noteToUpdate.content = content;
            }
        }

        tab.dirty = false;
        saveNotes();
        renderFilteredNotes();
        renderTabs();
        setAutosaveStatus(fromAutosave ? `Autosaved at ${getSaveTimestamp()}` : `Saved at ${getSaveTimestamp()}`);
    };

    const scheduleAutosave = () => {
        clearAutosaveTimer();
        autosaveTimerId = setTimeout(() => {
            const activeTab = getActiveTab();
            if (activeTab && activeTab.dirty) {
                persistTab(activeTab, true);
            }
        }, AUTOSAVE_DELAY_MS);
    };

    const createDraftTab = () => {
        const draftId = `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        openTabs.unshift({
            id: draftId,
            title: '',
            content: '',
            isDraft: true,
            dirty: false
        });
        activeTabId = draftId;
        renderTabs();
        renderEditor();
        clearAutosaveTimer();
        setAutosaveStatus('Autosave: idle');
    };

    noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const activeTab = getActiveTab();
        if (!activeTab) {
            return;
        }
        persistTab(activeTab, false);
    });

    activeNoteCloseBtn.addEventListener('click', () => {
        if (!activeTabId) {
            return;
        }
        closeTab(activeTabId);
    });

    newNoteBtn.addEventListener('click', () => {
        createDraftTab();
    });

    noteTitleInput.addEventListener('input', () => {
        const activeTab = getActiveTab();
        if (!activeTab) {
            return;
        }
        activeTab.title = noteTitleInput.value;
        activeTab.dirty = true;
        renderTabs();
        setAutosaveStatus('Autosave in 30s...');
        scheduleAutosave();
    });

    noteContentInput.addEventListener('input', () => {
        const activeTab = getActiveTab();
        if (!activeTab) {
            return;
        }
        activeTab.content = noteContentInput.value;
        activeTab.dirty = true;
        renderTabs();
        setAutosaveStatus('Autosave in 30s...');
        scheduleAutosave();
    });

    deleteAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete ALL notes? This cannot be undone.')) {
            notes = [];
            openTabs = openTabs.filter(tab => tab.isDraft);
            activeTabId = openTabs.length > 0 ? openTabs[0].id : null;
            saveNotes();
            renderFilteredNotes();
            renderTabs();
            renderEditor();
            setAutosaveStatus(activeTabId ? 'Autosave: idle' : 'Open a note to start editing');
        }
    });

    searchInput.addEventListener('input', () => {
        currentSearchTerm = searchInput.value.toLowerCase();
        renderFilteredNotes();
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

    window.addEventListener('beforeunload', () => {
        openTabs.forEach(tab => {
            if (tab.dirty) {
                persistTab(tab, true);
            }
        });
    });

    // Initial render
    saveNotes(); // Save notes after potential migration
    renderFilteredNotes();
    setAutosaveStatus('Open a note to start editing');

    if (saveNowBtn) {
        saveNowBtn.innerHTML = '<i class="bi bi-save-fill me-2"></i>Save Now';
    }
});
