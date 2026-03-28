pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const DB_NAME = "pdf-dictionary-web";
const DB_VERSION = 1;
const ROOT_ID = null;

const state = {
  folders: [],
  documents: [],
  lookups: [],
  readingDaily: [],
  activeTab: "library",
  currentFolderId: ROOT_ID,
  searchQuery: "",
  selectedDocumentId: null,
  dictionaryEnabled: true,
  dictionaryOpen: false,
  lookupWord: "",
  lookupResults: [],
  dictionaryStatus: "idle",
  dictionaryMessage: "",
  pdfDocument: null,
  loadingDocumentId: null,
  currentPage: 1,
  totalPages: 0,
  zoomValue: "page-width",
  readingIntervalId: null,
};

const elements = {
  libraryTabButton: document.getElementById("libraryTabButton"),
  allDocumentsTabButton: document.getElementById("allDocumentsTabButton"),
  insightsTabButton: document.getElementById("insightsTabButton"),
  libraryWorkspace: document.getElementById("libraryWorkspace"),
  insightsWorkspace: document.getElementById("insightsWorkspace"),
  importButton: document.getElementById("importButton"),
  newFolderButton: document.getElementById("newFolderButton"),
  fileInput: document.getElementById("fileInput"),
  folderTitle: document.getElementById("folderTitle"),
  breadcrumbs: document.getElementById("breadcrumbs"),
  searchInput: document.getElementById("searchInput"),
  folderCount: document.getElementById("folderCount"),
  documentCount: document.getElementById("documentCount"),
  libraryList: document.getElementById("libraryList"),
  readerTitle: document.getElementById("readerTitle"),
  dictionaryToggle: document.getElementById("dictionaryToggle"),
  prevPageButton: document.getElementById("prevPageButton"),
  nextPageButton: document.getElementById("nextPageButton"),
  pageNumberInput: document.getElementById("pageNumberInput"),
  pageCountLabel: document.getElementById("pageCountLabel"),
  zoomSelect: document.getElementById("zoomSelect"),
  readerEmptyState: document.getElementById("readerEmptyState"),
  viewerContainer: document.getElementById("viewerContainer"),
  viewer: document.getElementById("viewer"),
  dictionaryTitle: document.getElementById("dictionaryTitle"),
  dictionaryContent: document.getElementById("dictionaryContent"),
  closeDictionaryButton: document.getElementById("closeDictionaryButton"),
  folderDialog: document.getElementById("folderDialog"),
  folderForm: document.getElementById("folderForm"),
  folderNameInput: document.getElementById("folderNameInput"),
  cancelFolderButton: document.getElementById("cancelFolderButton"),
  totalDocsValue: document.getElementById("totalDocsValue"),
  totalFoldersValue: document.getElementById("totalFoldersValue"),
  totalLookupsValue: document.getElementById("totalLookupsValue"),
  topWordValue: document.getElementById("topWordValue"),
  totalMinutesValue: document.getElementById("totalMinutesValue"),
  todayMinutesValue: document.getElementById("todayMinutesValue"),
  readingChart: document.getElementById("readingChart"),
  lookupChart: document.getElementById("lookupChart"),
};

let dbPromise;
let readingChart;
let lookupChart;

const eventBus = new pdfjsViewer.EventBus();
const linkService = new pdfjsViewer.PDFLinkService({ eventBus });
const viewer = new pdfjsViewer.PDFViewer({
  container: elements.viewerContainer,
  viewer: elements.viewer,
  eventBus,
  linkService,
  textLayerMode: 1,
  annotationMode: 0,
  removePageBorders: false,
});

linkService.setViewer(viewer);

eventBus.on("pagesinit", () => {
  viewer.currentScaleValue = state.zoomValue;
  syncViewerToolbar();
});

eventBus.on("pagechanging", async ({ pageNumber }) => {
  state.currentPage = pageNumber;
  syncViewerToolbar();
  await persistCurrentPage();
});

eventBus.on("scalechanging", ({ presetValue, scale }) => {
  state.zoomValue = presetValue || String(scale);
  syncViewerToolbar();
});

elements.viewerContainer.addEventListener("mouseup", handleTextSelection);
elements.viewerContainer.addEventListener("touchend", () => {
  window.setTimeout(handleTextSelection, 80);
});

elements.libraryTabButton.addEventListener("click", () => setActiveTab("library"));
elements.allDocumentsTabButton.addEventListener("click", () => {
  state.currentFolderId = ROOT_ID;
  setActiveTab("library");
  renderLibrary();
});
elements.insightsTabButton.addEventListener("click", () => setActiveTab("insights"));
elements.importButton.addEventListener("click", () => elements.fileInput.click());
elements.newFolderButton.addEventListener("click", () => openFolderDialog());
elements.fileInput.addEventListener("change", (event) => importDocuments(event.target.files));
elements.searchInput.addEventListener("input", (event) => {
  state.searchQuery = event.target.value.trim().toLowerCase();
  renderLibrary();
});
elements.dictionaryToggle.addEventListener("click", () => {
  state.dictionaryEnabled = !state.dictionaryEnabled;
  if (!state.dictionaryEnabled) {
    state.dictionaryOpen = false;
    document.body.classList.remove("dictionary-open");
  }
  renderDictionary();
  syncViewerToolbar();
});
elements.closeDictionaryButton.addEventListener("click", () => {
  state.dictionaryOpen = false;
  document.body.classList.remove("dictionary-open");
});
elements.prevPageButton.addEventListener("click", () => goToPage(state.currentPage - 1));
elements.nextPageButton.addEventListener("click", () => goToPage(state.currentPage + 1));
elements.pageNumberInput.addEventListener("change", (event) => {
  goToPage(Number(event.target.value));
});
elements.zoomSelect.addEventListener("change", (event) => {
  state.zoomValue = event.target.value;
  viewer.currentScaleValue = state.zoomValue;
});
elements.folderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createFolder(elements.folderNameInput.value);
  elements.folderDialog.close();
});
elements.cancelFolderButton.addEventListener("click", () => elements.folderDialog.close());

window.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopReadingTicker();
  } else {
    startReadingTicker();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1280) {
    document.body.classList.remove("dictionary-open");
  }
});

void bootstrap();

async function bootstrap() {
  await loadData();
  setActiveTab("library");
  renderLibrary();
  renderReader();
  renderDictionary();
  renderInsights();
  startReadingTicker();
}

async function loadData() {
  state.folders = await getAllRecords("folders");
  state.documents = await getAllRecords("documents");
  state.lookups = await getAllRecords("lookups");
  state.readingDaily = await getAllRecords("readingDaily");

  if (state.selectedDocumentId && !getDocumentById(state.selectedDocumentId)) {
    state.selectedDocumentId = null;
  }
}

function setActiveTab(tab) {
  state.activeTab = tab;
  const libraryActive = tab === "library";
  const allDocumentsActive = libraryActive && state.currentFolderId === ROOT_ID;
  const folderLibraryActive = libraryActive && !allDocumentsActive;

  elements.libraryTabButton.classList.toggle("is-active", folderLibraryActive);
  elements.libraryTabButton.setAttribute("aria-selected", String(folderLibraryActive));
  elements.allDocumentsTabButton.classList.toggle("is-active", allDocumentsActive);
  elements.allDocumentsTabButton.setAttribute("aria-selected", String(allDocumentsActive));
  elements.insightsTabButton.classList.toggle("is-active", !libraryActive);
  elements.insightsTabButton.setAttribute("aria-selected", String(!libraryActive));
  elements.libraryWorkspace.classList.toggle("hidden", !libraryActive);
  elements.insightsWorkspace.classList.toggle("hidden", libraryActive);
  elements.importButton.classList.toggle("hidden", !libraryActive);

  if (!libraryActive) {
    stopReadingTicker();
    document.body.classList.remove("dictionary-open");
  } else {
    startReadingTicker();
  }

  renderInsights();
}

function renderLibrary() {
  const currentFolders = state.folders
    .filter((folder) => sameParent(folder.parentId, state.currentFolderId))
    .filter((folder) => matchesSearch(folder.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentDocuments = state.documents
    .filter((documentRecord) => sameParent(documentRecord.folderId, state.currentFolderId))
    .filter((documentRecord) => matchesSearch(documentRecord.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentFolder = getFolderById(state.currentFolderId);
  elements.folderTitle.textContent = currentFolder ? currentFolder.name : "All Documents";
  setActiveTab("library");
  elements.folderCount.textContent = String(currentFolders.length);
  elements.documentCount.textContent = String(currentDocuments.length);
  renderBreadcrumbs();

  if (currentFolders.length === 0 && currentDocuments.length === 0) {
    elements.libraryList.innerHTML = `
      <div class="empty-state">
        <strong>No PDFs in this folder yet.</strong>
        <p>Import a PDF or create a subfolder to build your browser-based library.</p>
      </div>
    `;
    return;
  }

  const folderCards = currentFolders.map((folder) => `
    <article class="item-card">
      <div class="item-icon folder">F</div>
      <div class="item-meta">
        <h3>${escapeHtml(folder.name)}</h3>
        <p>Folder · ${formatDate(folder.createdAt)}</p>
      </div>
      <div class="card-actions">
        <button class="text-button" type="button" data-action="open-folder" data-folder-id="${folder.id}">Open</button>
        <button class="danger-button" type="button" data-action="delete-folder" data-folder-id="${folder.id}">Delete</button>
      </div>
    </article>
  `).join("");

  const documentCards = currentDocuments.map((documentRecord) => `
    <article class="item-card ${documentRecord.id === state.selectedDocumentId ? "is-selected" : ""}">
      <div class="item-icon document">PDF</div>
      <div class="item-meta">
        <h3>${escapeHtml(documentRecord.name)}</h3>
        <p>${formatFileSize(documentRecord.size)} · ${formatDate(documentRecord.updatedAt)}</p>
      </div>
      <div class="card-actions">
        <button class="text-button" type="button" data-action="open-document" data-document-id="${documentRecord.id}">Read</button>
        <button class="danger-button" type="button" data-action="delete-document" data-document-id="${documentRecord.id}">Delete</button>
      </div>
    </article>
  `).join("");

  elements.libraryList.innerHTML = `<div class="item-grid">${folderCards}${documentCards}</div>`;
  bindLibraryActions();
}

function renderBreadcrumbs() {
  const path = buildFolderPath(state.currentFolderId);
  elements.breadcrumbs.innerHTML = path.map((item, index) => `
    <button
      class="breadcrumb-button ${index === path.length - 1 ? "current" : ""}"
      type="button"
      data-breadcrumb-id="${item.id ?? ""}"
    >
      ${escapeHtml(item.label)}
    </button>
  `).join("<span>/</span>");

  elements.breadcrumbs.querySelectorAll("[data-breadcrumb-id]").forEach((button, index, array) => {
    button.addEventListener("click", () => {
      if (index === array.length - 1) {
        return;
      }
      const rawId = button.getAttribute("data-breadcrumb-id");
      state.currentFolderId = rawId || ROOT_ID;
      renderLibrary();
    });
  });
}

function bindLibraryActions() {
  elements.libraryList.querySelectorAll("[data-action='open-folder']").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentFolderId = button.getAttribute("data-folder-id");
      renderLibrary();
    });
  });

  elements.libraryList.querySelectorAll("[data-action='delete-folder']").forEach((button) => {
    button.addEventListener("click", async () => {
      const folder = getFolderById(button.getAttribute("data-folder-id"));
      if (!folder) {
        return;
      }
      const approved = window.confirm(`Delete "${folder.name}" and all PDFs inside it?`);
      if (approved) {
        await deleteFolder(folder.id);
      }
    });
  });

  elements.libraryList.querySelectorAll("[data-action='open-document']").forEach((button) => {
    button.addEventListener("click", async () => {
      await openDocument(button.getAttribute("data-document-id"));
    });
  });

  elements.libraryList.querySelectorAll("[data-action='delete-document']").forEach((button) => {
    button.addEventListener("click", async () => {
      const documentRecord = getDocumentById(button.getAttribute("data-document-id"));
      if (!documentRecord) {
        return;
      }
      const approved = window.confirm(`Delete "${documentRecord.name}" from this browser library?`);
      if (approved) {
        await deleteDocument(documentRecord.id);
      }
    });
  });
}

function renderReader() {
  const selectedDocument = getDocumentById(state.selectedDocumentId);
  const hasDocument = Boolean(selectedDocument);

  elements.readerTitle.textContent = selectedDocument ? selectedDocument.name : "Select a PDF to start reading";
  elements.readerEmptyState.innerHTML = `
    <strong>Your PDFs stay in this browser.</strong>
    <p>Import a file, open it, and select a word inside the page to look up its meaning.</p>
  `;
  elements.readerEmptyState.classList.toggle("hidden", hasDocument);
  elements.viewerContainer.classList.toggle("hidden", !hasDocument);

  syncViewerToolbar();
}

function syncViewerToolbar() {
  const hasDocument = Boolean(state.selectedDocumentId && state.pdfDocument);
  const hasAnySelection = Boolean(state.selectedDocumentId);

  elements.prevPageButton.disabled = !hasDocument || state.currentPage <= 1;
  elements.nextPageButton.disabled = !hasDocument || state.currentPage >= state.totalPages;
  elements.pageNumberInput.disabled = !hasDocument;
  elements.zoomSelect.disabled = !hasDocument;
  elements.pageNumberInput.value = hasDocument ? String(state.currentPage) : "1";
  elements.pageCountLabel.textContent = `/ ${hasDocument ? state.totalPages : 0}`;

  if ([...elements.zoomSelect.options].some((option) => option.value === state.zoomValue)) {
    elements.zoomSelect.value = state.zoomValue;
  }

  elements.dictionaryToggle.disabled = !hasAnySelection;
  elements.dictionaryToggle.textContent = state.dictionaryEnabled ? "Dictionary On" : "Dictionary Off";
  elements.dictionaryToggle.setAttribute("aria-pressed", String(state.dictionaryEnabled));
}

function renderDictionary() {
  elements.dictionaryTitle.textContent = state.lookupWord ? state.lookupWord : (state.dictionaryEnabled ? "Ready" : "Paused");

  if (!state.selectedDocumentId) {
    elements.dictionaryContent.innerHTML = `
      <div class="empty-state">
        <strong>No document selected.</strong>
        <p>Open a PDF first, then select a word to look it up.</p>
      </div>
    `;
    return;
  }

  if (!state.dictionaryEnabled) {
    elements.dictionaryContent.innerHTML = `
      <div class="empty-state">
        <strong>Dictionary mode is off.</strong>
        <p>Turn it back on to fetch definitions when you select text.</p>
      </div>
    `;
    return;
  }

  if (state.dictionaryStatus === "loading") {
    elements.dictionaryContent.innerHTML = `
      <div class="empty-state">
        <strong>Looking up <span class="word-pill">${escapeHtml(state.lookupWord)}</span></strong>
        <p>Fetching dictionary entries.</p>
      </div>
    `;
    return;
  }

  if (state.dictionaryStatus === "error") {
    elements.dictionaryContent.innerHTML = `
      <div class="empty-state">
        <strong>${escapeHtml(state.lookupWord || "No result")}</strong>
        <p>${escapeHtml(state.dictionaryMessage || "Definition not found.")}</p>
      </div>
    `;
    return;
  }

  if (!state.lookupWord || state.lookupResults.length === 0) {
    elements.dictionaryContent.innerHTML = `
      <div class="empty-state">
        <strong>Dictionary mode is on.</strong>
        <p>Select a single word in the PDF to fetch its definition.</p>
      </div>
    `;
    return;
  }

  const markup = state.lookupResults.map((entry) => `
    <section class="definition-block">
      <h3>${escapeHtml(entry.partOfSpeech || "Meaning")}</h3>
      ${entry.phonetic ? `<p><span class="word-pill">${escapeHtml(entry.phonetic)}</span></p>` : ""}
      <ul>
        ${entry.definitions.map((definition) => `<li>${escapeHtml(definition)}</li>`).join("")}
      </ul>
    </section>
  `).join("");

  elements.dictionaryContent.innerHTML = `
    <p><span class="word-pill">${escapeHtml(state.lookupWord)}</span></p>
    ${markup}
  `;
}

function renderInsights() {
  const totalMinutes = state.readingDaily.reduce((sum, item) => sum + item.minutes, 0);
  const todayKey = dateKeyFor(new Date());
  const todayMinutes = state.readingDaily.find((item) => item.id === todayKey)?.minutes ?? 0;
  const topWords = buildTopWords(state.lookups);
  const topWord = topWords[0];

  elements.totalDocsValue.textContent = `${state.documents.length} PDF${state.documents.length === 1 ? "" : "s"}`;
  elements.totalFoldersValue.textContent = `${state.folders.length} folder${state.folders.length === 1 ? "" : "s"}`;
  elements.totalLookupsValue.textContent = `${state.lookups.length} lookup${state.lookups.length === 1 ? "" : "s"}`;
  elements.topWordValue.textContent = topWord ? `"${topWord.word}" looked up ${topWord.count} times` : "No word selected yet";
  elements.totalMinutesValue.textContent = `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  elements.todayMinutesValue.textContent = `${todayMinutes} minute${todayMinutes === 1 ? "" : "s"} today`;

  renderReadingChart();
  renderLookupChart(topWords);
}

async function importDocuments(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    elements.fileInput.value = "";
    return;
  }

  const existingNames = new Set(
    state.documents
      .filter((documentRecord) => sameParent(documentRecord.folderId, state.currentFolderId))
      .map((documentRecord) => documentRecord.name.toLowerCase())
  );

  for (const file of files) {
    const record = {
      id: createId(),
      name: dedupeName(file.name, existingNames),
      folderId: state.currentFolderId,
      size: file.size,
      blob: file,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastPage: 1,
    };

    existingNames.add(record.name.toLowerCase());
    await putRecord("documents", record);
  }

  elements.fileInput.value = "";
  await loadData();
  renderLibrary();
  renderInsights();
}

function openFolderDialog() {
  elements.folderNameInput.value = "";
  elements.folderDialog.showModal();
  elements.folderNameInput.focus();
}

async function createFolder(rawName) {
  const name = rawName.trim();
  if (!name) {
    return;
  }

  const siblingNames = new Set(
    state.folders
      .filter((folder) => sameParent(folder.parentId, state.currentFolderId))
      .map((folder) => folder.name.toLowerCase())
  );

  const record = {
    id: createId(),
    name: dedupeName(name, siblingNames),
    parentId: state.currentFolderId,
    createdAt: new Date().toISOString(),
  };

  await putRecord("folders", record);
  await loadData();
  renderLibrary();
  renderInsights();
}

async function deleteFolder(folderId) {
  const descendantIds = collectFolderDescendants(folderId);
  const documentsToDelete = state.documents.filter((documentRecord) => descendantIds.includes(documentRecord.folderId));

  for (const documentRecord of documentsToDelete) {
    await deleteRecord("documents", documentRecord.id);
  }

  for (const id of descendantIds) {
    await deleteRecord("folders", id);
  }

  if (descendantIds.includes(state.currentFolderId)) {
    state.currentFolderId = ROOT_ID;
  }

  if (documentsToDelete.some((documentRecord) => documentRecord.id === state.selectedDocumentId)) {
    state.selectedDocumentId = null;
    state.pdfDocument = null;
    state.totalPages = 0;
    state.currentPage = 1;
    stopReadingTicker();
  }

  await loadData();
  renderLibrary();
  renderReader();
  renderDictionary();
  renderInsights();
}

async function deleteDocument(documentId) {
  await deleteRecord("documents", documentId);

  if (state.selectedDocumentId === documentId) {
    state.selectedDocumentId = null;
    state.pdfDocument = null;
    state.totalPages = 0;
    state.currentPage = 1;
    state.lookupWord = "";
    state.lookupResults = [];
    state.dictionaryStatus = "idle";
    stopReadingTicker();
  }

  await loadData();
  renderLibrary();
  renderReader();
  renderDictionary();
  renderInsights();
}

async function openDocument(documentId) {
  const documentRecord = getDocumentById(documentId);
  if (!documentRecord) {
    return;
  }

  state.selectedDocumentId = documentId;
  state.loadingDocumentId = documentId;
  state.lookupWord = "";
  state.lookupResults = [];
  state.dictionaryStatus = "idle";
  renderLibrary();
  renderReader();
  renderDictionary();

  try {
    const bytes = new Uint8Array(await documentRecord.blob.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
    });
    const pdfDocument = await loadingTask.promise;

    if (state.loadingDocumentId !== documentId) {
      return;
    }

    state.pdfDocument = pdfDocument;
    state.totalPages = pdfDocument.numPages;
    state.currentPage = Math.min(documentRecord.lastPage || 1, pdfDocument.numPages);
    viewer.setDocument(pdfDocument);
    linkService.setDocument(pdfDocument, null);
    viewer.currentPageNumber = state.currentPage;
    viewer.currentScaleValue = state.zoomValue;
    renderReader();
    startReadingTicker();
  } catch (error) {
    state.pdfDocument = null;
    state.totalPages = 0;
    state.currentPage = 1;
    elements.readerEmptyState.classList.remove("hidden");
    elements.viewerContainer.classList.add("hidden");
    elements.readerTitle.textContent = "Unable to open this PDF";
    elements.readerEmptyState.innerHTML = `
      <strong>PDF rendering failed.</strong>
      <p>${escapeHtml(error instanceof Error ? error.message : String(error || "Unknown error"))}</p>
    `;
  } finally {
    state.loadingDocumentId = null;
    syncViewerToolbar();
  }
}

function goToPage(pageNumber) {
  if (!state.pdfDocument) {
    return;
  }

  const nextPage = Math.max(1, Math.min(state.totalPages, Number(pageNumber) || 1));
  viewer.currentPageNumber = nextPage;
  state.currentPage = nextPage;
  syncViewerToolbar();
}

async function persistCurrentPage() {
  const documentRecord = getDocumentById(state.selectedDocumentId);
  if (!documentRecord) {
    return;
  }

  const updatedRecord = {
    ...documentRecord,
    lastPage: state.currentPage,
    updatedAt: new Date().toISOString(),
  };

  await putRecord("documents", updatedRecord);
  await loadData();
  renderLibrary();
}

async function handleTextSelection() {
  if (!state.dictionaryEnabled || !state.selectedDocumentId) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.anchorNode) {
    return;
  }

  if (!elements.viewerContainer.contains(selection.anchorNode)) {
    return;
  }

  const match = selection.toString().trim().match(/[A-Za-z][A-Za-z'-]*/);
  if (!match) {
    return;
  }

  const word = match[0].toLowerCase();
  if (word === state.lookupWord && state.dictionaryStatus === "success") {
    if (window.innerWidth < 1280) {
      state.dictionaryOpen = true;
      document.body.classList.add("dictionary-open");
    }
    return;
  }

  await lookupWord(word);
}

async function lookupWord(word) {
  state.lookupWord = word;
  state.lookupResults = [];
  state.dictionaryStatus = "loading";
  state.dictionaryMessage = "";
  state.dictionaryOpen = true;
  renderDictionary();

  if (window.innerWidth < 1280) {
    document.body.classList.add("dictionary-open");
  }

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) {
      throw new Error("No dictionary entry was returned for this word.");
    }

    const entries = await response.json();
    const meanings = flattenDictionaryEntries(entries);
    if (meanings.length === 0) {
      throw new Error("The dictionary returned the word, but without definitions.");
    }

    state.lookupResults = meanings;
    state.dictionaryStatus = "success";
    await recordLookup(word, meanings[0]?.partOfSpeech || "unknown");
  } catch (error) {
    state.lookupResults = [];
    state.dictionaryStatus = "error";
    state.dictionaryMessage = error instanceof Error ? error.message : "Lookup failed.";
  }

  renderDictionary();
  renderInsights();
}

async function recordLookup(word, partOfSpeech) {
  const record = {
    id: createId(),
    word,
    partOfSpeech,
    documentId: state.selectedDocumentId,
    createdAt: new Date().toISOString(),
  };

  await putRecord("lookups", record);
  await loadData();
}

function startReadingTicker() {
  if (state.readingIntervalId || !state.selectedDocumentId || document.hidden || state.activeTab !== "library") {
    return;
  }

  state.readingIntervalId = window.setInterval(async () => {
    if (!state.selectedDocumentId || document.hidden || state.activeTab !== "library") {
      return;
    }
    await addReadingMinute();
  }, 60000);
}

function stopReadingTicker() {
  if (state.readingIntervalId) {
    window.clearInterval(state.readingIntervalId);
    state.readingIntervalId = null;
  }
}

async function addReadingMinute() {
  const key = dateKeyFor(new Date());
  const existing = state.readingDaily.find((item) => item.id === key);
  const record = {
    id: key,
    minutes: (existing?.minutes ?? 0) + 1,
  };

  await putRecord("readingDaily", record);
  await loadData();
  renderInsights();
}

function renderReadingChart() {
  if (!window.Chart) {
    return;
  }

  const series = buildReadingSeries();
  const labels = series.map((item) => item.label);
  const values = series.map((item) => item.minutes);

  if (readingChart) {
    readingChart.destroy();
  }

  readingChart = new window.Chart(elements.readingChart, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Minutes",
        data: values,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        borderColor: "#0d7a72",
        backgroundColor: "rgba(13, 122, 114, 0.16)",
        pointRadius: 4,
        pointBackgroundColor: "#0b5f59",
      }],
    },
    options: baseChartOptions(),
  });
}

function renderLookupChart(topWords) {
  if (!window.Chart) {
    return;
  }

  const labels = topWords.slice(0, 6).map((item) => item.word);
  const values = topWords.slice(0, 6).map((item) => item.count);

  if (lookupChart) {
    lookupChart.destroy();
  }

  lookupChart = new window.Chart(elements.lookupChart, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Lookups",
        data: values,
        backgroundColor: ["#b8783d", "#0d7a72", "#37526d", "#7a5d9e", "#b24f4f", "#5e8a32"],
        borderRadius: 10,
      }],
    },
    options: {
      ...baseChartOptions(),
      scales: {
        x: {
          ticks: { color: "#61707c" },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#61707c",
            precision: 0,
          },
          grid: {
            color: "rgba(24, 33, 43, 0.08)",
          },
        },
      },
    },
  });
}

function baseChartOptions() {
  return {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#18212b",
        titleColor: "#fffdf8",
        bodyColor: "#fffdf8",
      },
    },
    scales: {
      x: {
        ticks: { color: "#61707c" },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#61707c",
          precision: 0,
        },
        grid: {
          color: "rgba(24, 33, 43, 0.08)",
        },
      },
    },
  };
}

function flattenDictionaryEntries(entries) {
  return entries.flatMap((entry) => {
    const phonetic = entry.phonetic || entry.phonetics?.find((item) => item.text)?.text || "";
    return (entry.meanings || []).map((meaning) => ({
      partOfSpeech: meaning.partOfSpeech || "Meaning",
      phonetic,
      definitions: (meaning.definitions || [])
        .slice(0, 3)
        .map((definition) => definition.definition)
        .filter(Boolean),
    })).filter((meaning) => meaning.definitions.length > 0);
  });
}

function buildReadingSeries() {
  const today = new Date();
  const output = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = dateKeyFor(date);
    const stored = state.readingDaily.find((item) => item.id === key);
    output.push({
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      minutes: stored?.minutes ?? 0,
    });
  }

  return output;
}

function buildTopWords(lookups) {
  const counts = new Map();
  for (const lookup of lookups) {
    counts.set(lookup.word, (counts.get(lookup.word) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

function collectFolderDescendants(folderId) {
  const ids = [folderId];
  for (const folder of state.folders.filter((item) => item.parentId === folderId)) {
    ids.push(...collectFolderDescendants(folder.id));
  }
  return ids;
}

function buildFolderPath(folderId) {
  const items = [{ id: ROOT_ID, label: "Library" }];
  const chain = [];
  let cursor = folderId;
  const seen = new Set();

  while (cursor) {
    if (seen.has(cursor)) {
      break;
    }
    seen.add(cursor);
    const folder = getFolderById(cursor);
    if (!folder) {
      break;
    }
    chain.unshift({ id: folder.id, label: folder.name });
    cursor = folder.parentId;
  }

  return items.concat(chain);
}

function getFolderById(folderId) {
  return state.folders.find((folder) => folder.id === folderId) || null;
}

function getDocumentById(documentId) {
  return state.documents.find((documentRecord) => documentRecord.id === documentId) || null;
}

function matchesSearch(value) {
  return !state.searchQuery || value.toLowerCase().includes(state.searchQuery);
}

function sameParent(left, right) {
  return (left ?? ROOT_ID) === (right ?? ROOT_ID);
}

function dedupeName(originalName, usedNames) {
  const lowerOriginal = originalName.toLowerCase();
  if (!usedNames.has(lowerOriginal)) {
    return originalName;
  }

  const dotIndex = originalName.lastIndexOf(".");
  const hasExtension = dotIndex > 0;
  const base = hasExtension ? originalName.slice(0, dotIndex) : originalName;
  const extension = hasExtension ? originalName.slice(dotIndex) : "";

  let counter = 1;
  let candidate = `${base} (${counter})${extension}`;
  while (usedNames.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base} (${counter})${extension}`;
  }
  return candidate;
}

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function dateKeyFor(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getAllRecords(storeName) {
  return withStore(storeName, "readonly", (store) => store.getAll());
}

async function putRecord(storeName, value) {
  return withStore(storeName, "readwrite", (store) => store.put(value));
}

async function deleteRecord(storeName, key) {
  return withStore(storeName, "readwrite", (store) => store.delete(key));
}

async function withStore(storeName, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("folders")) {
          db.createObjectStore("folders", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("documents")) {
          db.createObjectStore("documents", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("lookups")) {
          db.createObjectStore("lookups", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("readingDaily")) {
          db.createObjectStore("readingDaily", { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}
