package sh.reception.reactnative

import java.net.URI
import java.net.URISyntaxException

/** `configureForTesting` connects only to this machine: http or https on localhost, 127.0.0.1 or ::1. */
internal object Loopback {
  fun isLoopback(url: String): Boolean {
    val uri = try {
      URI(url)
    } catch (_: URISyntaxException) {
      return false
    }
    return uri.scheme in setOf("http", "https") && uri.host in setOf("localhost", "127.0.0.1", "[::1]", "::1")
  }
}
