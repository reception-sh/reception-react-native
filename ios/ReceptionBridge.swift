import Foundation
import Observation
import Reception

@MainActor
internal final class ReceptionBridge {
  private static weak var current: ReceptionBridge?
  private static var revision = 0
  static var appearanceValues: [String: Any] = [:]
  private lazy var requests = PaywallRequests()
  private var connected = false
  private var settingRevisions: [String: Int] = [:]
  private var observation = UUID()
  private var emit: ((String, [String: Any]) -> Void)?

  nonisolated init() {}

  func connect(emit: @escaping (String, [String: Any]) -> Void) -> [String: Any] {
    Self.current?.invalidate()
    Self.current = self
    connected = true
    self.emit = emit
    Reception.shared.onEvent = { [weak self] event in self?.send(event) }
    observe()
    return snapshot()
  }

  func invalidate() {
    connected = false
    observation = UUID()
    requests.cancelAll()
    emit = nil
    guard Self.current === self else { return }
    Reception.shared.onEvent = nil
    Reception.shared.onPaywall = nil
    // A missing JS runtime must not turn a previously filtered offer into an available one.
    if Reception.shared.paywallAvailability != nil {
      Reception.shared.paywallAvailability = { _ in false }
    }
    Self.current = nil
  }

  func snapshot() -> [String: Any] {
    Self.revision += 1
    let sdk = Reception.shared
    return [
      "revision": Self.revision, "settingRevisions": settingRevisions,
      "isConfigured": Reception.isConfigured,
      "unreadCount": sdk.unreadCount, "isChatOpen": sdk.isChatOpen,
      "availablePaywalls": sdk.availablePaywalls.map(PaywallValues.value),
      "paywalls": sdk.paywalls.map(PaywallValues.value),
      "appearance": Self.appearanceValues, "updatesAppBadge": sdk.updatesAppBadge,
      "usesRemoteAppearance": sdk.usesRemoteAppearance,
      "languageOverride": sdk.languageOverride as Any? ?? NSNull(),
      "logLevel": ["off", "error", "info", "debug"][Reception.logLevel.rawValue],
    ]
  }

  func applySetting(_ key: String, revision: Int, update: () -> Void) -> [String: Any] {
    if connected && revision > (settingRevisions[key] ?? 0) {
      update()
      settingRevisions[key] = revision
    }
    return snapshot()
  }

  func setPaywallHandler(_ enabled: Bool) {
    Reception.shared.onPaywall =
      enabled ? { [weak self] id in self?.emit?("onPaywall", ["id": id]) } : nil
  }

  func setAvailability(_ enabled: Bool, generation: Int) {
    requests.cancelAll()
    guard enabled else {
      Reception.shared.paywallAvailability = nil
      return
    }
    requests.emit = { [weak self] requestId, id in
      self?.emit?("onAvailability", ["requestId": requestId, "id": id, "generation": generation])
    }
    Reception.shared.paywallAvailability = { [weak self] id in
      guard let self, self.connected else { return false }
      return await self.requests.check(id)
    }
  }

  func resolve(_ requestId: String, allowed: Bool) { requests.resolve(requestId, allowed: allowed) }

  private func observe() {
    guard connected else { return }
    let token = observation
    withObservationTracking {
      emit?("onState", snapshot())
    } onChange: { [weak self] in
      Task { @MainActor in
        guard let self, self.connected, self.observation == token else { return }
        self.observe()
      }
    }
  }

  private func send(_ event: ReceptionEvent) {
    switch event {
    case .identityRejected(let error):
      emit?(
        "onEvent",
        ["type": "identityRejected", "error": ["code": error.code, "status": error.status]])
    case .chatOpened: emit?("onEvent", ["type": "chatOpened"])
    case .messageSent: emit?("onEvent", ["type": "messageSent"])
    case .imageSent: emit?("onEvent", ["type": "imageSent"])
    case .reviewOpened: emit?("onEvent", ["type": "reviewOpened"])
    case .paywallOpened: emit?("onEvent", ["type": "paywallOpened"])
    case .dataDeleted: emit?("onEvent", ["type": "dataDeleted"])
    }
  }
}
