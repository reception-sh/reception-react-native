import Reception

/// Converts paywalls between the JS objects the bridge receives and returns and the SDK's values.
internal enum PaywallValues {
  static func paywall(_ entry: [String: Any]) -> ReceptionPaywall? {
    guard let id = entry["id"] as? String, let title = entry["title"] as? String else { return nil }
    let products = (entry["products"] as? [[String: Any]] ?? []).compactMap { product -> ReceptionPaywall.Product? in
      guard let id = product["id"] as? String else { return nil }
      return ReceptionPaywall.Product(
        id: id, price: product["price"] as? String, period: product["period"] as? String,
        trial: product["trial"] as? String)
    }
    return ReceptionPaywall(
      id: id, title: title, source: (entry["source"] as? String).map { ReceptionPaywall.Source(rawValue: $0) },
      products: products, presentable: entry["presentable"] as? Bool ?? true)
  }

  /// Mirrors the JS shape: optional details appear only when set, so `{ id, title }` round-trips unchanged.
  static func value(_ paywall: ReceptionPaywall) -> [String: Any] {
    var entry: [String: Any] = ["id": paywall.id, "title": paywall.title]
    if let source = paywall.source { entry["source"] = source.rawValue }
    if !paywall.products.isEmpty {
      entry["products"] = paywall.products.map { product -> [String: Any] in
        var value: [String: Any] = ["id": product.id]
        if let price = product.price { value["price"] = price }
        if let period = product.period { value["period"] = period }
        if let trial = product.trial { value["trial"] = trial }
        return value
      }
    }
    if !paywall.presentable { entry["presentable"] = false }
    return entry
  }
}
