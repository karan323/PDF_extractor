import SwiftUI

/// The entry point for the PDF Dictionary application.  This struct defines the
/// window group and loads the `ContentView` as the root view.  The `@main`
/// attribute marks this as the application delegate for SwiftUI.
@main
struct PDFDictionaryAppApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
