// =========================
// NOTES DATA
// =========================

function escapeHtml(value) {

    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


function readList(key) {

    try {

        const stored = JSON.parse(localStorage.getItem(key));

        return Array.isArray(stored) ? stored : null;

    } catch (error) {

        return null;
    }
}


let notes = readList("notes") || [];

let folders = readList("folders") || [
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


// =========================
// PRO STATUS
// =========================

let isPro = localStorage.getItem("isPro") === "true";


// =========================
// NOTES ELEMENTS
// =========================

const notesList = document.getElementById("noteList");
const noteTitle = document.getElementById("noteTitle");
const noteText = document.getElementById("NoteText");
const editIndex = document.getElementById("editIndex");
const saveBtn = document.getElementById("saveBtn");
const noteModal = document.getElementById("noteModal");
const modalTitle = document.getElementById("modalTitle");


// =========================
// FOLDER ELEMENTS
// =========================

const folderList = document.getElementById("folderList");
const folderModal = document.getElementById("folderModal");
const folderName = document.getElementById("folderName");
const createFolderBtn = document.getElementById("createFolderBtn");


// =========================
// UPGRADE ELEMENT
// =========================

const upgradeBtn = document.getElementById("upgradeBtn");


// =========================
// DISPLAY NOTES
// =========================

function displayNotes() {

    notesList.innerHTML = notes.map((note, index) => `

        <div class="col-md-4">

            <div class="note-card ${escapeHtml(note.color || "")}">

                <h6>${escapeHtml(note.title || "Untitled")}</h6>

                <p>${escapeHtml(note.text || "")}</p>

                <div class="note-actions">

                    <i class="bi bi-pencil-square"
                       role="button"
                       data-action="edit-note"
                       data-index="${index}">
                    </i>

                    <i class="bi bi-trash"
                       role="button"
                       data-action="delete-note"
                       data-index="${index}">
                    </i>

                </div>

            </div>

        </div>

    `).join("");
}


// =========================
// NOTE ACTIONS
// =========================

notesList.addEventListener("click", (event) => {

    const target = event.target.closest("[data-action]");

    if (!target || !notesList.contains(target)) {

        return;
    }


    const index = Number(target.dataset.index);


    if (target.dataset.action === "edit-note") {

        editNote(index);

    } else if (target.dataset.action === "delete-note") {

        deleteNote(index);
    }

});


// =========================
// SAVE NOTE
// =========================

saveBtn.addEventListener("click", () => {

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


    const index = Number(editIndex.value);


    // New Note
    if (editIndex.value === "" || !notes[index]) {

        notes.push(note);

    }

    // Edit Note
    else {

        notes[index] = note;

    }


    // Save notes in localStorage
    localStorage.setItem(
        "notes",
        JSON.stringify(notes)
    );


    // Show notes
    displayNotes();


    // Clear inputs
    noteTitle.value = "";
    noteText.value = "";
    editIndex.value = "";


    // Change modal title
    modalTitle.textContent = "Add note";


    // Close modal
    bootstrap.Modal
        .getOrCreateInstance(noteModal)
        .hide();

});


// =========================
// EDIT NOTE
// =========================

function editNote(index) {

    const note = notes[index];

    if (!note) {

        return;
    }


    // Show old data in inputs
    noteTitle.value = note.title || "";
    noteText.value = note.text || "";


    // Store note index
    editIndex.value = index;


    // Change modal title
    modalTitle.textContent = "Edit note";


    // Open modal
    bootstrap.Modal
        .getOrCreateInstance(noteModal)
        .show();

}


// =========================
// DELETE NOTE
// =========================

function deleteNote(index) {

    if (!notes[index]) {

        return;
    }


    // Confirmation
    const confirmDelete = confirm(
        "Are you sure you want to delete this note?"
    );


    if (confirmDelete) {

        // Delete note
        notes.splice(index, 1);


        // Update localStorage
        localStorage.setItem(
            "notes",
            JSON.stringify(notes)
        );


        // Refresh notes
        displayNotes();

    }

}


// =========================
// DISPLAY FOLDERS
// =========================

function displayFolders() {

    folderList.innerHTML = folders.map((folder, index) => `

        <div class="col-md-3">

            <div class="folder-card soft-blue">

                <div class="d-flex justify-content-between">

                    <h6>${escapeHtml(folder.name)}</h6>

                    <i class="bi bi-trash"
                       role="button"
                       data-action="delete-folder"
                       data-index="${index}">
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
    document
        .getElementById("addFolderBtn")
        .addEventListener("click", openFolderModal);

}


folderList.addEventListener("click", (event) => {

    const target = event.target.closest("[data-action='delete-folder']");

    if (!target || !folderList.contains(target)) {

        return;
    }


    deleteFolder(Number(target.dataset.index));

});


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
    bootstrap.Modal
        .getOrCreateInstance(folderModal)
        .show();

}


// =========================
// CREATE NEW FOLDER
// =========================

createFolderBtn.addEventListener("click", () => {

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


    // Save in localStorage
    localStorage.setItem(
        "folders",
        JSON.stringify(folders)
    );


    // Refresh folders
    displayFolders();


    // Clear input
    folderName.value = "";


    // Close modal
    bootstrap.Modal
        .getOrCreateInstance(folderModal)
        .hide();

});


// =========================
// DELETE FOLDER
// =========================

function deleteFolder(index) {

    if (!folders[index]) {

        return;
    }


    const confirmDelete = confirm(
        "Are you sure you want to delete this folder?"
    );


    if (confirmDelete) {

        // Remove folder
        folders.splice(index, 1);


        // Save updated folders
        localStorage.setItem(
            "folders",
            JSON.stringify(folders)
        );


        // Refresh folders
        displayFolders();

    }

}


// =========================
// UPGRADE PRO
// =========================

function updateProButton() {

    if (isPro) {

        upgradeBtn.innerHTML =
            '<i class="bi bi-check-circle"></i> Pro Active';

        upgradeBtn.classList.remove("btn-dark");

        upgradeBtn.classList.add("btn-success");

    }

}


upgradeBtn.addEventListener("click", () => {

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


    if (confirmUpgrade) {

        // Activate Pro
        isPro = true;


        // Save status
        localStorage.setItem(
            "isPro",
            JSON.stringify(isPro)
        );


        // Update button
        updateProButton();


        alert(
            "Congratulations! Pro version is now active. You can create unlimited folders."
        );

    }

});


// =========================
// SEARCH NOTES
// =========================

const searchInput =
    document.getElementById("searchInput");


searchInput.addEventListener("input", () => {

    const searchValue =
        searchInput.value.toLowerCase();


    const filteredNotes =
        notes.filter(note => {

            return (
                String(note.title || "")
                    .toLowerCase()
                    .includes(searchValue)

                ||

                String(note.text || "")
                    .toLowerCase()
                    .includes(searchValue)
            );

        });


    notesList.innerHTML =
        filteredNotes.map((note) => `

        <div class="col-md-4">

            <div class="note-card ${escapeHtml(note.color || "")}">

                <h6>${escapeHtml(note.title || "Untitled")}</h6>

                <p>${escapeHtml(note.text || "")}</p>

            </div>

        </div>

    `).join("");

});


// =========================
// INITIAL LOAD
// =========================

displayNotes();

displayFolders();

updateProButton();