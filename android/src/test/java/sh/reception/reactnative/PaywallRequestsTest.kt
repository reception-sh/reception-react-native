package sh.reception.reactnative

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PaywallRequestsTest {
  @Test
  fun `JS answers the check it was asked`() = runTest {
    val requests = PaywallRequests()
    val asked = mutableListOf<Pair<String, String>>()
    requests.emit = { requestId, paywall -> asked += requestId to paywall }
    val check = async { requests.check("plans") }
    runCurrent()
    assertEquals("plans", asked.single().second)
    requests.resolve(asked.single().first, allowed = true)
    assertTrue(check.await())
    assertEquals(0, requests.pendingCount)
  }

  @Test
  fun `a check without an answer fails closed after five seconds and reports the timeout`() = runTest {
    val requests = PaywallRequests()
    var timeouts = 0
    var requestId = ""
    requests.emit = { id, _ -> requestId = id }
    requests.onTimeout = { timeouts += 1 }
    val check = async { requests.check("plans") }
    advanceTimeBy(4_999)
    runCurrent()
    assertFalse(check.isCompleted)
    advanceTimeBy(2)
    assertFalse(check.await())
    assertEquals(1, timeouts)
    // A late answer finds nothing.
    requests.resolve(requestId, allowed = true)
    assertEquals(0, requests.pendingCount)
  }

  @Test
  fun `JS teardown fails every pending check and later checks`() = runTest {
    val requests = PaywallRequests()
    requests.emit = { _, _ -> }
    val first = async { requests.check("plans") }
    val second = async { requests.check("pro") }
    runCurrent()
    assertEquals(2, requests.pendingCount)
    requests.cancelAll()
    assertFalse(first.await())
    assertFalse(second.await())
    assertFalse(requests.check("plans"))
  }

  @Test
  fun `a cancelled check leaves no request behind`() = runTest {
    val requests = PaywallRequests()
    requests.emit = { _, _ -> }
    val check = async { requests.check("plans") }
    runCurrent()
    check.cancel()
    runCurrent()
    assertEquals(0, requests.pendingCount)
  }

  @Test
  fun `without JS no check is sent`() = runTest {
    assertFalse(PaywallRequests().check("plans"))
  }
}
