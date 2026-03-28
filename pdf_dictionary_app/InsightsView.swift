import SwiftUI
import Charts

struct ReadingTime: Identifiable {
    let id = UUID()
    let day: String
    let minutes: Int
}

struct VocabularyStat: Identifiable {
    let id = UUID()
    let category: String
    let count: Int
}

struct InsightsView: View {
    // Mock data for visualization
    let weeklyReading = [
        ReadingTime(day: "Mon", minutes: 45),
        ReadingTime(day: "Tue", minutes: 30),
        ReadingTime(day: "Wed", minutes: 75),
        ReadingTime(day: "Thu", minutes: 20),
        ReadingTime(day: "Fri", minutes: 60),
        ReadingTime(day: "Sat", minutes: 120),
        ReadingTime(day: "Sun", minutes: 90)
    ]

    let vocabularyStats = [
        VocabularyStat(category: "Academic", count: 24),
        VocabularyStat(category: "Technical", count: 42),
        VocabularyStat(category: "Literature", count: 15),
        VocabularyStat(category: "General", count: 31)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Section 1: Reading Activity
                    chartCard(title: "Weekly Reading Activity", subtitle: "Minutes per day") {
                        Chart {
                            ForEach(weeklyReading) { data in
                                AreaMark(
                                    x: .value("Day", data.day),
                                    y: .value("Minutes", data.minutes)
                                )
                                .foregroundStyle(LinearGradient(colors: [.blue.opacity(0.4), .blue.opacity(0)], startPoint: .top, endPoint: .bottom))
                                .interpolationMethod(.catmullRom)

                                LineMark(
                                    x: .value("Day", data.day),
                                    y: .value("Minutes", data.minutes)
                                )
                                .foregroundStyle(.blue)
                                .lineStyle(StrokeStyle(lineWidth: 3))
                                .interpolationMethod(.catmullRom)
                            }
                        }
                        .frame(height: 200)
                    }

                    // Section 2: Vocabulary Growth
                    chartCard(title: "Vocabulary Lookups", subtitle: "Definitions by category") {
                        Chart {
                            ForEach(vocabularyStats) { stat in
                                BarMark(
                                    x: .value("Count", stat.count),
                                    y: .value("Category", stat.category)
                                )
                                .foregroundStyle(by: .value("Category", stat.category))
                                .cornerRadius(4)
                            }
                        }
                        .frame(height: 180)
                        .chartLegend(.hidden)
                    }

                    // Section 3: Summary Tiles
                    HStack(spacing: 15) {
                        summaryTile(title: "Total Read", value: "7.4 hrs", icon: "clock.badge.checkmark", color: .orange)
                        summaryTile(title: "Words Found", value: "112", icon: "character.book.closed.fill", color: .purple)
                    }
                }
                .padding()
            }
            .navigationTitle("Insights")
            .background(Color(UIColor.systemGroupedBackground))
        }
    }

    @ViewBuilder
    private func chartCard<Content: View>(title: String, subtitle: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(subtitle).font(.caption).foregroundColor(.secondary)
            }
            content()
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }

    private func summaryTile(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading) {
            Label(title, systemImage: icon).font(.caption).foregroundColor(color)
            Text(value).font(.title2).bold().padding(.top, 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}

#Preview("Light Mode") {
    InsightsView()
}

#Preview("Dark Mode") {
    InsightsView()
        .preferredColorScheme(.dark)
}
