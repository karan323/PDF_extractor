import SwiftUI
import UIKit

/// A view that wraps `UIReferenceLibraryViewController` to present a dictionary
/// definition for a given term.  iOS exposes its built-in dictionaries only via
/// this view controller; it cannot be used to fetch definitions programmatically
/// and must be displayed directly.  Each time the
/// `term` changes the view is recreated so that the dictionary updates.
struct DictionaryPanel: UIViewControllerRepresentable {
    /// The word or term to look up in the dictionary.
    let term: String

    func makeUIViewController(context: Context) -> UIReferenceLibraryViewController {
        let controller = UIReferenceLibraryViewController(term: term)
        return controller
    }

    func updateUIViewController(_ uiViewController: UIReferenceLibraryViewController, context: Context) {
        // UIReferenceLibraryViewController does not provide a way to change the
        // term after initialisation.  To update the definition, SwiftUI recreates
        // the entire view whenever `term` changes (via `.id(term)` in the caller).
    }
}
