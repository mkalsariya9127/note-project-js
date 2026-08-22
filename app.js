// let notes = JSON.parse(localStorage.getItem("notes")) || [];

// const notesList = document.getElementById("noteList");
// const noteTitle = document.getElementById("noteTitle");
// const noteText = document.getElementById("NoteText");
// const editIndex = document.getElementById("editIndex");
// const saveBtn = document.getElementById("saveBtn");
// const noteModal = document.getElementById("noteModal");
// const modalTitle = document.getElementById("modalTitle");

// function displayNotes() {
//     notesList.innerHTML = notes.map((note, index) => `
//         <div class="col-md-4">
//             <div class="note-card ${note.color || ""}">
//                 <h6>${note.title || "Untitled"}</h6>
//                 <p>${note.text || ""}</p>
//                 <div class="note-actions">
//                     <i class="bi bi-pencil-square" role="button" onclick="editNote(${index})"></i>
//                     <i class="bi bi-trash" role="button" onclick="deleteNote(${index})"></i>
//                 </div>
//             </div>
//         </div>
//     `).join("");
// }

// saveBtn.addEventListener("click", () => {
//     const title = noteTitle.value.trim();
//     const text = noteText.value.trim();

//     if (!title || !text) {
//         alert("Please fill all fields");
//         return;
//     }

//     const note = { title, text, color: "bg-blue" };
//     const index = editIndex.value;

//     if (index === "") {
//         notes.push(note);
//     } else {
//         notes[Number(index)] = note;
//     }

//     localStorage.setItem("notes", JSON.stringify(notes));
//     displayNotes();
//     noteTitle.value = "";
//     noteText.value = "";
//     editIndex.value = "";
//     modalTitle.textContent = "Add note";
//     bootstrap.Modal.getOrCreateInstance(noteModal).hide();
// });

// window.editNote = (index) => {
//     const note = notes[index];
//     noteTitle.value = note.title || "";
//     noteText.value = note.text || "";
//     editIndex.value = index;
//     modalTitle.textContent = "Edit note";
//     bootstrap.Modal.getOrCreateInstance(noteModal).show();
// };

// window.deleteNote = (index) => {
//     notes.splice(index, 1);
//     localStorage.setItem("notes", JSON.stringify(notes));
//     displayNotes();
// };

// displayNotes();


// =========================
// ERROR REPORTING
// =========================

function logError(context, error) {

    console.error(`[notes] ${context}`, error);

}


// Log for developers, tell the user something actually went wrong.
function reportError(context, error, userMessage) {

    logError(context, error);

    if (userMessage) {

        alert(userMessage);

    }

}


// Surface failures that would otherwise only reach the console.
window.addEventListener("error", (event) => {

    logError("Uncaught error", event.error || event.message);

});


window.addEventListener("unhandledrejection", (event) => {

    logError("Unhandled promise rejection", event.reason);

});


// =========================
// STORAGE HELPERS
// =========================

// localStorage can be unavailable (private mode, disabled storage) and its
// contents can be corrupt, so every access is guarded and validated.
function readStorage(key, fallback, isValid) {

    let raw;

    try {

        raw = localStorage.getItem(key);

    } catch (error) {

        reportError(
            `Cannot read "${key}" from localStorage`,
            error,
            "Storage is not available, so your notes cannot be loaded or saved in this browser."
        );

        return fallback;
    }


    if (raw === null) {

        return fallback;
    }


    let parsed;

    try {

        parsed = JSON.parse(raw);

    } catch (error) {

        reportError(
            `Stored value for "${key}" is not valid JSON, falling back to defaults`,
            error,
            "Some saved data was unreadable and has been reset."
        );

        return fallback;
    }


    if (!isValid(parsed)) {

        logError(
            `Stored value for "${key}" has an unexpected shape, falling back to defaults`,
            parsed
        );

        return fallback;
    }


    return parsed;
}


// Returns false when the write failed so callers can undo their change
// instead of showing state that was never persisted.
function writeStorage(key, value) {

    try {

        localStorage.setItem(key, JSON.stringify(value));

        return true;

    } catch (error) {

        reportError(
            `Cannot save "${key}" to localStorage`,
            error,
            "Your changes could not be saved. Storage may be full or unavailable."
        );

        return false;
    }

}


// =========================
// DOM HELPERS
// =========================

const missingElements = [];


function requireElement(id) {

    const element = document.getElementById(id);

    if (!element) {

        missingElements.push(id);

    }

    return element;
}


// Binds a listener only when the element exists, and never lets a handler
// throw silently past the event loop.
function on(element, eventName, handler, context, userMessage) {

    if (!element) {

        logError(
            `Cannot bind "${eventName}" for ${context}: element is missing`,
            null
        );

        return;
    }


    element.addEventListener(eventName, (event) => {

        try {

            handler(event);

        } catch (error) {

            reportError(context, error, userMessage);

        }

    });

}


// Bootstrap is loaded from a CDN, so it may be missing at runtime.
function toggleModal(modalElement, action, context) {

    if (!modalElement) {

        logError(`Cannot ${action} modal for ${context}: element is missing`, null);

        return false;
    }


    if (typeof bootstrap === "undefined" || !bootstrap.Modal) {

        reportError(
            `Bootstrap JS is not available, cannot ${action} modal for ${context}`,
            null,
            "The page did not load completely. Please reload and try again."
        );

        return false;
    }


    try {

        bootstrap.Modal
            .getOrCreateInstance(modalElement)[action]();

        return true;

    } catch (error) {

        reportError(`Failed to ${action} modal for ${context}`, error);

        return false;
    }

}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


// =========================
// NOTES DATA
// =========================

const DEFAULT_FOLDERS = [
    {
        name: "Movie Reviews",
        date: "12/08/2026"
    },
    {
        name: "class note",
        date: "02/08/2026"
    },
    {
        name: "book list",
        date: "02/08/2026"
    }
];


function isRecordArray(value) {

    return Array.isArray(value)
        && value.every(item => item !== null && typeof item === "object");
}


let notes = readStorage("notes", [], isRecordArray);

let folders = readStorage("folders", DEFAULT_FOLDERS.slice(), isRecordArray);


// =========================
// PRO STATUS
// =========================

let isPro = readStorage(
    "isPro",
    false,
    value => typeof value === "boolean"
);


// =========================
// NOTES ELEMENTS
// =========================

const notesList = requireElement("noteList");
const noteTitle = requireElement("noteTitle");
const noteText = requireElement("NoteText");
const editIndex = requireElement("editIndex");
const saveBtn = requireElement("saveBtn");
const noteModal = requireElement("noteModal");
const modalTitle = requireElement("modalTitle");


// =========================
// FOLDER ELEMENTS
// =========================

const folderList = requireElement("folderList");
const folderModal = requireElement("folderModal");
const folderName = requireElement("folderName");
const createFolderBtn = requireElement("createFolderBtn");


// =========================
// UPGRADE ELEMENT
// =========================

const upgradeBtn = requireElement("upgradeBtn");


// =========================
// SEARCH ELEMENT
// =========================

const searchInput = requireElement("searchInput");


if (missingElements.length > 0) {

    logError(
        `Missing expected elements: ${missingElements.join(", ")}`,
        null
    );

}


// =========================
// NOTE INDEX VALIDATION
// =========================

function resolveIndex(list, rawIndex, context) {

    const index = Number(rawIndex);

    if (!Number.isInteger(index) || index < 0 || index >= list.length) {

        reportError(
            `${context}: index ${rawIndex} is out of range`,
            null,
            "That item no longer exists. Please refresh the page."
        );

        return -1;
    }

    return index;
}


// =========================
// RENDER NOTE CARDS
// =========================

function noteCardMarkup(note, index) {

    const actions = index === null ? "" : `

                <div class="note-actions">

                    <i class="bi bi-pencil-square"
                       role="button"
                       onclick="editNote(${index})">
                    </i>

                    <i class="bi bi-trash"
                       role="button"
                       onclick="deleteNote(${index})">
                    </i>

                </div>
    `;

    return `

        <div class="col-md-4">

            <div class="note-card ${escapeHtml(note.color || "")}">

                <h6>${escapeHtml(note.title || "Untitled")}</h6>

                <p>${escapeHtml(note.text || "")}</p>
                ${actions}
            </div>

        </div>

    `;
}


// =========================
// DISPLAY NOTES
// =========================

function displayNotes() {

    if (!notesList) {

        logError("Cannot display notes: #noteList is missing", null);

        return;
    }


    notesList.innerHTML = notes
        .map((note, index) => noteCardMarkup(note, index))
        .join("");
}


// =========================
// SAVE NOTE
// =========================

on(saveBtn, "click", () => {

    const title = noteTitle.value.trim();
    const text = noteText.value.trim();

    // Check empty fields
    if (!title || !text) {

        alert("Please fill all fields");

        return;
    }


    // Create note object
    const note = {

        title: title,
        text: text,
        color: "bg-blue"

    };


    const rawIndex = editIndex.value;

    let replaced;
    let index = -1;


    // New Note
    if (rawIndex === "") {

        notes.push(note);

    }

    // Edit Note
    else {

        index = resolveIndex(notes, rawIndex, "Save note");

        if (index === -1) {

            return;
        }

        replaced = notes[index];
        notes[index] = note;

    }


    // Save notes in localStorage, undoing the change if it cannot be stored
    if (!writeStorage("notes", notes)) {

        if (rawIndex === "") {

            notes.pop();

        } else {

            notes[index] = replaced;

        }

        return;
    }


    // Show notes
    displayNotes();


    // Clear inputs
    noteTitle.value = "";
    noteText.value = "";
    editIndex.value = "";


    // Change modal title
    modalTitle.textContent = "Add note";


    // Close modal
    toggleModal(noteModal, "hide", "save note");

}, "Failed to save note", "The note could not be saved.");


// =========================
// EDIT NOTE
// =========================

window.editNote = (rawIndex) => {

    try {

        const index = resolveIndex(notes, rawIndex, "Edit note");

        if (index === -1) {

            return;
        }


        const note = notes[index];


        // Show old data in inputs
        noteTitle.value = note.title || "";
        noteText.value = note.text || "";


        // Store note index
        editIndex.value = index;


        // Change modal title
        modalTitle.textContent = "Edit note";


        // Open modal
        toggleModal(noteModal, "show", "edit note");

    } catch (error) {

        reportError("Failed to open note for editing", error, "This note could not be opened.");

    }

};


// =========================
// DELETE NOTE
// =========================

window.deleteNote = (rawIndex) => {

    try {

        const index = resolveIndex(notes, rawIndex, "Delete note");

        if (index === -1) {

            return;
        }


        // Confirmation
        const confirmDelete = confirm(
            "Are you sure you want to delete this note?"
        );


        if (!confirmDelete) {

            return;
        }


        // Delete note
        const [removed] = notes.splice(index, 1);


        // Update localStorage, restoring the note if the write failed
        if (!writeStorage("notes", notes)) {

            notes.splice(index, 0, removed);

            return;
        }


        // Refresh notes
        displayNotes();

    } catch (error) {

        reportError("Failed to delete note", error, "This note could not be deleted.");

    }

};


// =========================
// DISPLAY FOLDERS
// =========================

function displayFolders() {

    if (!folderList) {

        logError("Cannot display folders: #folderList is missing", null);

        return;
    }


    folderList.innerHTML = folders.map((folder, index) => `

        <div class="col-md-3">

            <div class="folder-card soft-blue">

                <div class="d-flex justify-content-between">

                    <h6>${escapeHtml(folder.name)}</h6>

                    <i class="bi bi-trash"
                       role="button"
                       onclick="deleteFolder(${index})">
                    </i>

                </div>

                <p class="text-muted small">
                    ${escapeHtml(folder.date)}
                </p>

            </div>

        </div>

    `).join("");


    // Add New Folder button
    folderList.innerHTML += `

        <div class="col-md-3">

            <div class="folder-card add-folder"
                 id="addFolderBtn"
                 role="button">

                <i class="bi bi-folder-plus fs-1"></i>

                <p class="small">
                    New folder
                </p>

            </div>

        </div>

    `;


    // New Folder button click
    on(
        document.getElementById("addFolderBtn"),
        "click",
        openFolderModal,
        "Failed to open the new folder dialog",
        "The new folder dialog could not be opened."
    );

}


// =========================
// OPEN FOLDER MODAL
// =========================

function openFolderModal() {

    // Free user limit
    if (!isPro && folders.length >= 3) {

        alert(
            "Free plan ma maximum 3 folders allowed che. Unlimited folders mate Upgrade Pro karo."
        );

        return;
    }


    // Clear input
    folderName.value = "";


    // Open modal
    toggleModal(folderModal, "show", "new folder");

}


// =========================
// CREATE NEW FOLDER
// =========================

on(createFolderBtn, "click", () => {

    const name = folderName.value.trim();


    // Empty validation
    if (!name) {

        alert("Please enter folder name");

        return;
    }


    // Current date
    const today = new Date();


    const date = today.toLocaleDateString(
        "en-GB"
    );


    // Create folder object
    const folder = {

        name: name,
        date: date

    };


    // Add folder
    folders.push(folder);


    // Save in localStorage, undoing the change if it cannot be stored
    if (!writeStorage("folders", folders)) {

        folders.pop();

        return;
    }


    // Refresh folders
    displayFolders();


    // Clear input
    folderName.value = "";


    // Close modal
    toggleModal(folderModal, "hide", "new folder");

}, "Failed to create folder", "The folder could not be created.");


// =========================
// DELETE FOLDER
// =========================

window.deleteFolder = (rawIndex) => {

    try {

        const index = resolveIndex(folders, rawIndex, "Delete folder");

        if (index === -1) {

            return;
        }


        const confirmDelete = confirm(
            "Are you sure you want to delete this folder?"
        );


        if (!confirmDelete) {

            return;
        }


        // Remove folder
        const [removed] = folders.splice(index, 1);


        // Save updated folders, restoring the folder if the write failed
        if (!writeStorage("folders", folders)) {

            folders.splice(index, 0, removed);

            return;
        }


        // Refresh folders
        displayFolders();

    } catch (error) {

        reportError("Failed to delete folder", error, "This folder could not be deleted.");

    }

};


// =========================
// UPGRADE PRO
// =========================

function updateProButton() {

    if (!upgradeBtn) {

        logError("Cannot update Pro button: #upgradeBtn is missing", null);

        return;
    }


    if (isPro) {

        upgradeBtn.innerHTML =
            '<i class="bi bi-check-circle"></i> Pro Active';

        upgradeBtn.classList.remove("btn-dark");

        upgradeBtn.classList.add("btn-success");

    }

}


on(upgradeBtn, "click", () => {

    // Already Pro
    if (isPro) {

        alert(
            "You are already a Pro user!"
        );

        return;
    }


    const confirmUpgrade = confirm(
        "Do you want to upgrade to Pro for unlimited folders?"
    );


    if (!confirmUpgrade) {

        return;
    }


    // Save status first so Pro is never enabled without being persisted
    if (!writeStorage("isPro", true)) {

        return;
    }


    // Activate Pro
    isPro = true;


    // Update button
    updateProButton();


    alert(
        "Congratulations! Pro version is now active. You can create unlimited folders."
    );

}, "Failed to upgrade to Pro", "The upgrade could not be completed.");


// =========================
// SEARCH NOTES
// =========================

on(searchInput, "input", () => {

    const searchValue =
        searchInput.value.toLowerCase();


    // Titles and texts may be missing on stored notes, so read them defensively
    const filteredNotes =
        notes.filter(note => {

            const title = String(note.title ?? "").toLowerCase();
            const text = String(note.text ?? "").toLowerCase();

            return title.includes(searchValue)
                || text.includes(searchValue);

        });


    if (!notesList) {

        logError("Cannot display search results: #noteList is missing", null);

        return;
    }


    notesList.innerHTML = filteredNotes
        .map(note => noteCardMarkup(note, null))
        .join("");

}, "Search failed", null);


// =========================
// INITIAL LOAD
// =========================

displayNotes();

displayFolders();

updateProButton();
