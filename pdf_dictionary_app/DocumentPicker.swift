import SwiftUI
import UniformTypeIdentifiers

/// A wrapper around `UIDocumentPickerViewController` that allows users to
/// import PDF files from the system’s Files app.  When the user completes the
/// picker, the selected file URLs are delivered via the `completion` closure.
struct DocumentPicker: UIViewControllerRepresentable {
    /// A closure that receives the list of picked document URLs.  The closure
    /// is called when the user finishes picking documents or cancels the
    /// picker.
    let completion: ([URL]) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(completion: completion)
    }

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        // Limit the picker to PDF files.  You can add other UTTypes to this
        // array if you wish to support additional document formats.
        let controller = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.pdf], asCopy: true)
        controller.delegate = context.coordinator
        controller.allowsMultipleSelection = true
        return controller
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {
        // No need to update the controller – it presents modally.
    }

    /// Coordinator implements `UIDocumentPickerDelegate` and forwards the
    /// results to the SwiftUI closure.
    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let completion: ([URL]) -> Void
        init(completion: @escaping ([URL]) -> Void) {
            self.completion = completion
        }
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            completion(urls)
        }
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            completion([])
        }
    }
}
