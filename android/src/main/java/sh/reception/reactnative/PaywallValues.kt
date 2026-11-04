package sh.reception.reactnative

import sh.reception.ReceptionPaywall

/** Converts paywalls between the JS objects the bridge receives and returns and the SDK's values. */
internal object PaywallValues {
  fun paywall(entry: Map<String, Any?>): ReceptionPaywall? {
    val id = entry["id"] as? String ?: return null
    val title = entry["title"] as? String ?: return null
    val products = (entry["products"] as? List<*>).orEmpty().mapNotNull { product ->
      val values = product as? Map<*, *> ?: return@mapNotNull null
      val productId = values["id"] as? String ?: return@mapNotNull null
      ReceptionPaywall.Product(
        productId,
        price = values["price"] as? String,
        period = values["period"] as? String,
        trial = values["trial"] as? String,
      )
    }
    return ReceptionPaywall(
      id,
      title,
      source = (entry["source"] as? String)?.let { ReceptionPaywall.Source(it) },
      products = products,
      presentable = entry["presentable"] as? Boolean ?: true,
    )
  }

  /** Mirrors the JS shape: optional details appear only when set, so `{ id, title }` round-trips unchanged. */
  fun value(paywall: ReceptionPaywall): Map<String, Any?> = buildMap {
    put("id", paywall.id)
    put("title", paywall.title)
    paywall.source?.let { put("source", it.rawValue) }
    if (paywall.products.isNotEmpty()) {
      put("products", paywall.products.map { product ->
        buildMap {
          put("id", product.id)
          product.price?.let { put("price", it) }
          product.period?.let { put("period", it) }
          product.trial?.let { put("trial", it) }
        }
      })
    }
    if (!paywall.presentable) put("presentable", false)
  }
}
