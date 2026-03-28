import SwiftUI

/// A higher-level view that composes `PDFKitView` with a dictionary side panel
/// and a toggle button.  When `url` is non-nil the corresponding PDF is
/// displayed.  Users can enable “dictionary mode” via the toolbar button; when
/// enabled, tapping a word in the PDF will cause its definition to appear in
/// the side bar (on iPad) or a sheet (on iPhone).
struct PDFViewerContainerView: View {
    /// The URL of the PDF document to display.  If `nil`, a placeholder
    /// message is shown instead.
    let url: URL?

    /// The word currently selected in the PDF.  When dictionary mode is
    /// active and this value is non-nil, the dictionary panel displays a
    /// definition for it.
    @State private var selectedWord: String?

    /// Controls whether dictionary mode is active.
    @State private var dictionaryActive: Bool = false

    var body: some View {
        if let url = url {
            // Use `GeometryReader` to adapt the layout based on available space.
            GeometryReader { geometry in
                let isWide = geometry.size.width > 600

                HStack(spacing: 0) {
                    PDFKitView(url: url, selectedWord: $selectedWord)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .overlay(alignment: .topTrailing) {
                            Button(action: {
                                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                    dictionaryActive.toggle()
                                }
                            }) {
                                Image(systemName: dictionaryActive ? "book.fill" : "book")
                                    .padding(12)
                                    .background(.ultraThinMaterial)
                                    .clipShape(Circle())
                            }
                            .padding()
                            .accessibilityLabel(dictionaryActive ? "Disable dictionary lookup" : "Enable dictionary lookup")
                        }
                    // On wide screens present the dictionary panel inline; on narrow
                    // screens it appears in a sheet.
                    if dictionaryActive && isWide {
                        Divider()
                        Group {
                            if let word = selectedWord, !word.isEmpty {
                                DictionaryPanel(term: word)
                                    .id(word) // force recreation when term changes
                                    .transition(.move(edge: .trailing).combined(with: .opacity))
                                    .frame(width: 350)
                            } else {
                                VStack {
                                    Text("Tap a word to look up its definition.")
                                        .multilineTextAlignment(.center)
                                        .padding()
                                    Spacer()
                                }
                                .frame(width: 350)
                            }
                        }
                        .background(Color(UIColor.secondarySystemBackground))
                    }
                }
                // Present dictionary as a sheet on compact devices
                .sheet(isPresented: Binding(
                    get: { dictionaryActive && !isWide && selectedWord != nil },
                    set: { newValue in
                        dictionaryActive = newValue
                    }
                )) {
                    if let word = selectedWord {
                        DictionaryPanel(term: word)
                            .id(word)
                    }
                }
            }
        } else {
            // Placeholder view when no PDF is selected
            VStack {
                Image(systemName: "doc.richtext")
                    .font(.system(size: 72))
                    .foregroundStyle(.tertiary)
                    .padding(.bottom)
                Text("Select a document to start reading")
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

#Preview("Empty State") {
    PDFViewerContainerView(url: nil)
}

#Preview("Landscape (Wide)") {
    PDFViewerContainerView(url: nil)
        .previewInterfaceOrientation(.landscapeLeft)
}
