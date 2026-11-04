package sh.reception.reactnative

import android.content.Context
import sh.reception.Reception
import sh.reception.ReceptionInternalApi

/** Debug builds only: the example connects to a local backend. Release builds compile the empty twin in src/release. */
internal object TestingConfiguration {
  const val IS_AVAILABLE = true

  @OptIn(ReceptionInternalApi::class)
  fun configure(context: Context, appId: String, serviceUrl: String): Boolean {
    if (!Loopback.isLoopback(serviceUrl)) return false
    Reception.configureForTesting(context, appId, serviceUrl)
    return true
  }
}
