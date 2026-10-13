import Foundation

@main
struct PaywallRequestsTests {
  @MainActor
  static func main() async {
    let requests = PaywallRequests()
    let missing = await requests.check("missing")
    precondition(!missing, "No JS runtime must fail closed")

    requests.emit = { requestId, _ in requests.resolve(requestId, allowed: true) }
    let accepted = await requests.check("accepted")
    precondition(accepted, "JS response must resume the matching request")

    requests.emit = { requestId, _ in
      requests.resolve(requestId, allowed: false)
      requests.resolve(requestId, allowed: true)
    }
    let rejected = await requests.check("rejected")
    precondition(!rejected, "A duplicate response must not resume twice")

    var identifiers: [String] = []
    requests.emit = { requestId, _ in identifiers.append(requestId) }
    let first = Task { await requests.check("first") }
    let second = Task { await requests.check("second") }
    while identifiers.count < 2 { await Task.yield() }
    precondition(identifiers[0] != identifiers[1], "Requests must have independent IDs")
    requests.resolve(identifiers[1], allowed: true)
    requests.resolve(identifiers[0], allowed: false)
    let concurrent = await [first.value, second.value]
    precondition(concurrent.filter { $0 }.count == 1, "Concurrent responses must stay independent")

    identifiers = []
    requests.emit = { requestId, _ in identifiers.append(requestId) }
    let cancelled = Task { await requests.check("cancelled") }
    while identifiers.isEmpty { await Task.yield() }
    cancelled.cancel()
    let cancellation = await cancelled.value
    precondition(!cancellation, "SDK cancellation must release its continuation")
    requests.resolve(identifiers[0], allowed: true)

    identifiers = []
    let reload = Task { await requests.check("reload") }
    while identifiers.isEmpty { await Task.yield() }
    requests.cancelAll()
    let reloaded = await reload.value
    precondition(!reloaded && requests.emit == nil, "JS teardown must drain pending requests")
    requests.resolve(identifiers[0], allowed: true)

    requests.emit = { _, _ in }
    let started = ContinuousClock.now
    let timedOut = await requests.check("never-resolves")
    let elapsed = started.duration(to: .now)
    precondition(
      !timedOut && elapsed >= .seconds(5) && elapsed < .seconds(8),
      "An unresponsive callback must time out safely")
    print(
      "PaywallRequests: response, duplicate, concurrency, cancellation, reload, and timeout checks passed"
    )
  }
}
