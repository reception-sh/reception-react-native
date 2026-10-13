// Lives across JS reloads. A retained Expo response must not reopen an already handled tap.
@MainActor
final class NotificationRouting {
  static let shared = NotificationRouting()
  enum Action { case receive, receiveAndOpen, open, ignore }
  private var notifications: [String: Bool] = [:]

  func action(for id: String, openChat: Bool) -> Action {
    let previous = notifications[id]
    if previous == true || (previous == false && !openChat) { return .ignore }
    notifications[id] = openChat
    if openChat { return previous == nil ? .receiveAndOpen : .open }
    return .receive
  }
}
