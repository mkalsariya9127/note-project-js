// =========================
// SHARED UTILITIES
// =========================

const storageKeys = {
    notes: "notes",
    folders: "folders",
    isPro: "isPro"
};

function getStoredValue(key, fallback) {
    return JSON.parse(localStorage.getItem(key)) || fallback;
}

function setStoredValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function persistAndRender(key, value, render) {
    setStoredValue(key, value);
    render();
}

function showModal(element) {
    bootstrap.Modal.getOrCreateInstance(element).show();
}

function hideModal(element) {
    bootstrap.Modal.getOrCreateInstance(element).hide();
}

function deleteItem(items, index, itemName, storageKey, render) {
    const confirmDelete = confirm(
        `Are you sure you want to delete this ${itemName}?`
    );

    if (!confirmDelete) {
        return;
    }

    items.splice(index, 1);
    persistAndRender(storageKey, items, render);
}


// =========================
// NOTES DATA
// =========================

let notes = getStoredValue(storageKeys.notes, []);

let folders = getStoredValue(storageKeys.folders, [
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
]);


// =========================
// PRO STATUS
// =========================

let isPro = getStoredValue(storageKeys.isPro, false);


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

function renderNoteCard(note, index) {
    const actions = index === undefined
        ? ""
        : `
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

            <div class="note-card ${note.color || ""}">

                <h6>${note.title || "Untitled"}</h6>

                <p>${note.text || ""}</p>

                ${actions}

            </div>

        </div>

    `;
}

function displayNotes() {

    notesList.innerHTML = notes
        .map((note, index) => renderNoteCard(note, index))
        .join("");
}


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


    const index = editIndex.value;


    // New Note
    if (index === "") {

        notes.push(note);

    }

    // Edit Note
    else {

        notes[Number(index)] = note;

    }


    persistAndRender(storageKeys.notes, notes, displayNotes);


    // Clear inputs
    noteTitle.value = "";
    noteText.value = "";
    editIndex.value = "";


    // Change modal title
    modalTitle.textContent = "Add note";


    hideModal(noteModal);

});


// =========================
// EDIT NOTE
// =========================

window.editNote = (index) => {

    const note = notes[index];


    // Show old data in inputs
    noteTitle.value = note.title || "";
    noteText.value = note.text || "";


    // Store note index
    editIndex.value = index;


    // Change modal title
    modalTitle.textContent = "Edit note";


    showModal(noteModal);

};


// =========================
// DELETE NOTE
// =========================

window.deleteNote = (index) => {

    deleteItem(
        notes,
        index,
        "note",
        storageKeys.notes,
        displayNotes
    );

};


// =========================
// DISPLAY FOLDERS
// =========================

function displayFolders() {

    folderList.innerHTML = folders.map((folder, index) => `

        <div class="col-md-3">

            <div class="folder-card soft-blue">

                <div class="d-flex justify-content-between">

                    <h6>${folder.name}</h6>

                    <i class="bi bi-trash"
                       role="button"
                       onclick="deleteFolder(${index})">
                    </i>

                </div>

                <p class="text-muted small">
                    ${folder.date}
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


    showModal(folderModal);

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


    persistAndRender(storageKeys.folders, folders, displayFolders);


    // Clear input
    folderName.value = "";


    hideModal(folderModal);

});


// =========================
// DELETE FOLDER
// =========================

window.deleteFolder = (index) => {

    deleteItem(
        folders,
        index,
        "folder",
        storageKeys.folders,
        displayFolders
    );

};


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


        setStoredValue(storageKeys.isPro, isPro);


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
                note.title
                    .toLowerCase()
                    .includes(searchValue)

                ||

                note.text
                    .toLowerCase()
                    .includes(searchValue)
            );

        });


    notesList.innerHTML = filteredNotes
        .map((note) => renderNoteCard(note))
        .join("");

});


// =========================
// INITIAL LOAD
// =========================

displayNotes();

displayFolders();

updateProButton();