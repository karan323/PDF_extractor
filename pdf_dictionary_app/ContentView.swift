import SwiftUI

/// The root view of the application.  It uses a `NavigationSplitView` to
/// provide a side-by-side interface on larger screens: the library appears on
/// the leading side and the PDF reader appears on the trailing side.  On
/// smaller devices the split view collapses into a single navigation stack.
struct ContentView: View {
    /// The URL of the PDF currently selected in the library.  When this value
    /// changes the PDF viewer loads a new document.
    @State private var selectedURL: URL?

    /// Controls the visibility of columns in the split view.
    @State private var columnVisibility = NavigationSplitViewVisibility.all

    /// The root directory of the user’s library.  The Documents directory in
    /// the app’s sandbox persists across launches.
    private let rootDirectory: URL = {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
    }()

    var body: some View {
        TabView {
            NavigationSplitView(columnVisibility: $columnVisibility) {
                FileBrowserView(directoryURL: rootDirectory, selectedURL: $selectedURL)
                    .navigationTitle("Library")
            } detail: {
                PDFViewerContainerView(url: selectedURL)
            }
            .tabItem {
                Label("Library", systemImage: "books.vertical.fill")
            }

            InsightsView()
                .tabItem {
                    Label("Insights", systemImage: "chart.bar.fill")
                }
        }
    }
}

#Preview {
    ContentView()
}
