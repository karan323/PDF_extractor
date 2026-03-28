import SwiftUI
import PDFKit

/// A SwiftUI wrapper for `PDFView` from PDFKit.  It loads a PDF from a URL
/// and notifies SwiftUI when the user selects text within the document.  Only
/// the first word of the selection is propagated because iOS’s built-in
/// dictionary supports single-word lookups.
struct PDFKitView: UIViewRepresentable {
    /// The URL of the PDF document to display.
    let url: URL

    /// Binding to the currently selected word in the PDF.  Whenever the user
    /// selects text, this binding updates to the first alphabetic word in
    /// the selection.  If the selection is empty or does not contain any
    /// letters, the binding is set to `nil`.
    @Binding var selectedWord: String?

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.document = PDFDocument(url: url)
        // Register for selection change notifications.
        NotificationCenter.default.addObserver(
            context.coordinator,
            selector: #selector(Coordinator.handleSelection(_:)),
            name: Notification.Name.PDFViewSelectionChanged,
            object: pdfView
        )
        context.coordinator.pdfView = pdfView
        return pdfView
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        // Reload the document if the URL has changed.
        if uiView.document?.documentURL != url {
            uiView.document = PDFDocument(url: url)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(selectedWord: $selectedWord)
    }

    /// A helper object that manages selection change events from PDFKit.
    class Coordinator: NSObject {
        /// The PDFView being observed.  Stored so we can remove the observer on
        /// deinitialisation.
        weak var pdfView: PDFView?

        /// Binding to the currently selected word.
        @Binding var selectedWord: String?

        init(selectedWord: Binding<String?>) {
            _selectedWord = selectedWord
        }

        /// Called whenever the PDFView’s selection changes.  Extracts the
        /// selection string, trims whitespace and non-letters, and stores the
        /// first word in `selectedWord`.  If no suitable word exists, sets
        /// `selectedWord` to `nil`.
        @objc func handleSelection(_ notification: Notification) {
            guard let pdfView = pdfView,
                  let selection = pdfView.currentSelection,
                  let rawString = selection.string else {
                selectedWord = nil
                return
            }
            // Trim whitespace/newlines.
            let trimmed = rawString.trimmingCharacters(in: .whitespacesAndNewlines)
            // Split on any character that is not a letter.  This isolates
            // individual words.  We then choose the first word.
            let components = trimmed.split(whereSeparator: { !$0.isLetter })
            if let first = components.first {
                selectedWord = String(first)
            } else if !trimmed.isEmpty {
                selectedWord = trimmed
            } else {
                selectedWord = nil
            }
        }

        deinit {
            if let pdfView = pdfView {
                NotificationCenter.default.removeObserver(self, name: Notification.Name.PDFViewSelectionChanged, object: pdfView)
            }
        }
    }
}
