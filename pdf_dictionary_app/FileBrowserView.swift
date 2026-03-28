import SwiftUI

/// A view that displays the contents of a directory as a navigable list.  Users
/// can drill into subfolders, select PDF files to open them in the reader,
/// import new PDFs via the document picker, and create new folders.  The
/// selected PDF’s URL is bound to the parent view.
struct FileBrowserView: View {
    /// The directory whose contents are displayed in this view.
    let directoryURL: URL

    /// Binding to the currently selected PDF.  When the user taps a file
    /// (i.e. not a folder) this binding is updated and the reader will
    /// automatically load the document.
    @Binding var selectedURL: URL?

    /// The list of items (files and folders) in the directory.
    @State private var items: [URL] = []

    /// Controls presentation of the document picker sheet.
    @State private var showDocumentPicker = false

    /// Controls display of the new-folder alert.
    @State private var showNewFolderAlert = false

    /// Controls the layout style: Grid or List.
    @State private var isGridView = true

    /// Search text to filter the documents.
    @State private var searchText = ""

    /// The name of the folder being created via the alert.
    @State private var newFolderName: String = ""

    private var filteredItems: [URL] {
        if searchText.isEmpty { return items }
        return items.filter { $0.lastPathComponent.localizedCaseInsensitiveContains(searchText) }
    }

    private let columns = [
        GridItem(.adaptive(minimum: 120), spacing: 20)
    ]

    var body: some View {
        Group {
            if items.isEmpty {
                ContentUnavailableView("No Documents", systemImage: "doc.badge.plus", description: Text("Import your first PDF or create a folder."))
            } else if isGridView {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 20) {
                        ForEach(filteredItems, id: \.self) { url in
                            fileItem(url)
                        }
                    }
                    .padding()
                }
            } else {
                List {
                    ForEach(filteredItems, id: \.self) { url in
                        fileItem(url)
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .searchable(text: $searchText, prompt: "Search documents")
        .onAppear(perform: loadItems)
        .onChange(of: directoryURL) { _ in loadItems() }
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Button { isGridView.toggle() } label: {
                    Label("Toggle View", systemImage: isGridView ? "list.bullet" : "square.grid.2x2")
                }

                Button(action: { showNewFolderAlert = true }) {
                    Label("New Folder", systemImage: "folder.badge.plus")
                }

                Button(action: { showDocumentPicker = true }) {
                    Label("Import", systemImage: "plus")
                }
            }
        }
        .sheet(isPresented: $showDocumentPicker) {
            DocumentPicker { urls in
                importDocuments(urls)
            }
        }
        .alert("New Folder", isPresented: $showNewFolderAlert) {
            TextField("Name", text: $newFolderName)
            Button("Create", action: createFolder)
            Button("Cancel", role: .cancel) { }
        }
        .navigationDestination(for: URL.self) { url in
            FileBrowserView(directoryURL: url, selectedURL: $selectedURL)
        }
    }

    @ViewBuilder
    private func fileItem(_ url: URL) -> some View {
        let isDir = isDirectory(url)

        if isGridView {
            VStack {
                if isDir {
                    NavigationLink(value: url) {
                        folderIcon(url)
                    }
                } else {
                    Button { selectedURL = url } label: {
                        fileIcon(url)
                    }
                }
            }
            .contextMenu { contextMenuItems(for: url) }
        } else {
            if isDir {
                NavigationLink(value: url) {
                    Label(url.lastPathComponent, systemImage: "folder.fill")
                }
                .contextMenu { contextMenuItems(for: url) }
            } else {
                Button { selectedURL = url } label: {
                    Label(url.lastPathComponent, systemImage: "doc.text.fill")
                }
                .contextMenu { contextMenuItems(for: url) }
            }
        }
    }

    private func folderIcon(_ url: URL) -> some View {
        VStack {
            Image(systemName: "folder.fill")
                .font(.system(size: 60))
                .foregroundStyle(.tint)
            Text(url.lastPathComponent)
                .font(.caption)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
    }

    private func fileIcon(_ url: URL) -> some View {
        VStack {
            Image(systemName: "doc.text.fill")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            Text(url.lastPathComponent)
                .font(.caption)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
    }

    @ViewBuilder
    private func contextMenuItems(for url: URL) -> some View {
        Button(role: .destructive) {
            deleteItem(at: url)
        } label: {
            Label("Delete", systemImage: "trash")
        }
    }

    /// Loads the items in the current directory into the `items` array.
    private func loadItems() {
        do {
            let contents = try FileManager.default.contentsOfDirectory(at: directoryURL, includingPropertiesForKeys: [.isDirectoryKey], options: [.skipsHiddenFiles])
            items = contents.sorted { a, b in a.lastPathComponent.lowercased() < b.lastPathComponent.lowercased() }
        } catch {
            print("Error loading contents of \(directoryURL): \(error)")
            items = []
        }
    }

    /// Determines if the given URL refers to a directory.
    private func isDirectory(_ url: URL) -> Bool {
        (try? url.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false
    }

    private func deleteItem(at url: URL) {
        do {
            try FileManager.default.removeItem(at: url)
            loadItems()
        } catch {
            print("Error deleting: \(error)")
        }
    }

    /// Copies the selected PDFs into the current directory.  If a file with the
    /// same name exists, it appends a numerical suffix to avoid overwriting.
    private func importDocuments(_ urls: [URL]) {
        for src in urls {
            var dest = directoryURL.appendingPathComponent(src.lastPathComponent)
            var counter = 1
            while FileManager.default.fileExists(atPath: dest.path) {
                let base = src.deletingPathExtension().lastPathComponent
                let ext = src.pathExtension
                let newName = "\(base)-\(counter).\(ext)"
                dest = directoryURL.appendingPathComponent(newName)
                counter += 1
            }
            do {
                try FileManager.default.copyItem(at: src, to: dest)
            } catch {
                print("Failed to copy \(src) to \(dest): \(error)")
            }
        }
        loadItems()
    }

    /// Creates a new folder with the name specified in `newFolderName`.
    private func createFolder() {
        defer { newFolderName = "" }
        guard !newFolderName.isEmpty else { return }
        let folderURL = directoryURL.appendingPathComponent(newFolderName)
        do {
            try FileManager.default.createDirectory(at: folderURL, withIntermediateDirectories: false, attributes: nil)
        } catch {
            print("Failed to create folder \(folderURL): \(error)")
        }
        loadItems()
    }
}

#Preview("Library Grid") {
    let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try? FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)

    // Create some dummy files for the preview
    let folder = tmp.appendingPathComponent("Study Notes")
    try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let file = tmp.appendingPathComponent("Machine Learning.pdf")
    FileManager.default.createFile(atPath: file.path, contents: Data())

    return NavigationStack {
        FileBrowserView(directoryURL: tmp, selectedURL: .constant(nil))
    }
}

#Preview("Empty State") {
    NavigationStack {
        FileBrowserView(directoryURL: URL(fileURLWithPath: "/dev/null"), selectedURL: .constant(nil))
    }
}
