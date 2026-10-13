import ExpoModulesCore

#if DEBUG
  @_spi(ReceptionTesting) import Reception
#else
  import Reception
#endif

// Expo calls modules across queues. Our only stored state is an immutable main-actor bridge.
public final class ReceptionModule: Module, @unchecked Sendable {
  private let bridge = ReceptionBridge()

  public func definition() -> ModuleDefinition {
    Name("ReceptionReactNative")
    Constant("version") { Reception.version }
    Events("onState", "onEvent", "onPaywall", "onAvailability")

    AsyncFunction("connect") { (promise: Promise) in
      MainActor.assumeIsolated {
        promise.resolve(
          self.bridge.connect { [weak self] name, payload in self?.sendEvent(name, payload) } as Any
        )
      }
    }.runOnQueue(.main)
    OnDestroy { [bridge] in Task { @MainActor in bridge.invalidate() } }

    AsyncFunction("configure") { (appId: String, promise: Promise) in
      MainActor.assumeIsolated {
        Reception.configure(appId: appId)
        promise.resolve(self.bridge.snapshot() as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("identify") { (userId: String?, name: String?, email: String?) in
      MainActor.assumeIsolated {
        Reception.shared.identify(userId: userId, name: name, email: email)
      }
    }.runOnQueue(.main)
    AsyncFunction("identifyToken") { (token: String) in
      MainActor.assumeIsolated { Reception.shared.identify(token: token) }
    }.runOnQueue(.main)
    AsyncFunction("setMetadata") { (value: [String: String]) in
      MainActor.assumeIsolated { Reception.shared.setMetadata(value) }
    }.runOnQueue(.main)
    AsyncFunction("logout") { (promise: Promise) in
      MainActor.assumeIsolated {
        Reception.shared.logout()
        promise.resolve(self.bridge.snapshot() as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("deleteData") { (promise: Promise) in
      Task { @MainActor in
        do {
          try await Reception.shared.deleteData()
          promise.resolve(["state": self.bridge.snapshot()] as Any)
        } catch let error as ReceptionError {
          promise.resolve(
            [
              "state": self.bridge.snapshot(),
              "error": ["code": error.code, "status": error.status],
            ] as Any)
        } catch {
          promise.resolve(
            ["state": self.bridge.snapshot(), "error": ["code": "bridge_error", "status": 0]] as Any
          )
        }
      }
    }.runOnQueue(.main)
    AsyncFunction("openChat") { MainActor.assumeIsolated { Reception.shared.openChat() } }
      .runOnQueue(.main)
    AsyncFunction("closeChat") { MainActor.assumeIsolated { Reception.shared.closeChat() } }
      .runOnQueue(.main)
    AsyncFunction("setPushToken") { (token: String, environment: String) in
      MainActor.assumeIsolated {
        guard let data = PushToken.decode(token) else { return }
        let target: Reception.PushEnvironment
        switch environment {
        case "automatic": target = .automatic
        case "sandbox": target = .sandbox
        case "production": target = .production
        default: return
        }
        Reception.shared.setPushToken(data, environment: target)
      }
    }.runOnQueue(.main)
    AsyncFunction("handlePushNotification") { (conversationId: String, openChat: Bool) -> Bool in
      MainActor.assumeIsolated {
        Reception.shared.handlePushNotification(
          userInfo: ["reception": ["conversationId": conversationId]], openChat: openChat)
      }
    }.runOnQueue(.main)
    AsyncFunction("handleExpoNotification") { (id: String, conversationId: String, openChat: Bool) in
      MainActor.assumeIsolated {
        switch NotificationRouting.shared.action(for: id, openChat: openChat) {
        case .receive, .receiveAndOpen:
          Reception.shared.handlePushNotification(
            userInfo: ["reception": ["conversationId": conversationId]], openChat: openChat)
        case .open: Reception.shared.openChat()
        case .ignore: break
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("setAppearance") { (value: String, revision: Int, promise: Promise) in
      MainActor.assumeIsolated {
        promise.resolve(
          self.bridge.applySetting("appearance", revision: revision) {
            ReceptionAppearance.apply(value)
          } as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("setUpdatesAppBadge") { (value: Bool, revision: Int, promise: Promise) in
      MainActor.assumeIsolated {
        promise.resolve(
          self.bridge.applySetting("updatesAppBadge", revision: revision) {
            Reception.shared.updatesAppBadge = value
          } as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("setUsesRemoteAppearance") { (value: Bool, revision: Int, promise: Promise) in
      MainActor.assumeIsolated {
        promise.resolve(
          self.bridge.applySetting("usesRemoteAppearance", revision: revision) {
            Reception.shared.usesRemoteAppearance = value
          } as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("setLanguageOverride") { (value: String?, revision: Int, promise: Promise) in
      MainActor.assumeIsolated {
        promise.resolve(
          self.bridge.applySetting("languageOverride", revision: revision) {
            Reception.shared.languageOverride = value
          } as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("setLogLevel") { (value: String, revision: Int, promise: Promise) in
      MainActor.assumeIsolated {
        promise.resolve(
          self.bridge.applySetting("logLevel", revision: revision) {
            let levels: [String: Reception.LogLevel] = [
              "off": .off, "error": .error, "info": .info, "debug": .debug,
            ]
            if let level = levels[value] { Reception.logLevel = level }
          } as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("setPaywalls") { (value: [[String: String]], revision: Int, promise: Promise) in
      MainActor.assumeIsolated {
        promise.resolve(
          self.bridge.applySetting("paywalls", revision: revision) {
            Reception.shared.paywalls = value.compactMap { entry in
              guard let id = entry["id"], let title = entry["title"] else { return nil }
              return ReceptionPaywall(id: id, title: title)
            }
          } as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("setPaywallHandler") { (enabled: Bool) in
      MainActor.assumeIsolated { self.bridge.setPaywallHandler(enabled) }
    }.runOnQueue(.main)
    AsyncFunction("setPaywallAvailability") { (enabled: Bool, generation: Int, promise: Promise) in
      MainActor.assumeIsolated {
        self.bridge.setAvailability(enabled, generation: generation)
        promise.resolve(self.bridge.snapshot() as Any)
      }
    }.runOnQueue(.main)
    AsyncFunction("resolvePaywallAvailability") { (requestId: String, allowed: Bool) in
      MainActor.assumeIsolated { self.bridge.resolve(requestId, allowed: allowed) }
    }.runOnQueue(.main)
    AsyncFunction("refreshPaywalls") { (invalidate: Bool) in
      MainActor.assumeIsolated { Reception.shared.refreshPaywalls(invalidate: invalidate) }
    }.runOnQueue(.main)
    View(ReceptionNativeView.self) {}

    #if DEBUG
      AsyncFunction("configureForTesting") {
        (appId: String, serviceURL: String, promise: Promise) in
        MainActor.assumeIsolated {
          if let url = URL(string: serviceURL), let host = url.host, let scheme = url.scheme,
            ["localhost", "127.0.0.1", "::1"].contains(host), ["http", "https"].contains(scheme)
          {
            Reception.configure(appId: appId, serviceURL: url)
          }
          promise.resolve(self.bridge.snapshot() as Any)
        }
      }.runOnQueue(.main)
    #endif
  }
}
