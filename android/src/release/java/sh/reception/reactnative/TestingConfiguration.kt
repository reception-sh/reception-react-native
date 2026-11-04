package sh.reception.reactnative

import android.content.Context

/** Release builds have no `configureForTesting`; see src/debug. */
internal object TestingConfiguration {
  const val IS_AVAILABLE = false

  @Suppress("UNUSED_PARAMETER")
  fun configure(context: Context, appId: String, serviceUrl: String): Boolean = false
}
