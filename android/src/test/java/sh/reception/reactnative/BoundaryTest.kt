package sh.reception.reactnative

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import sh.reception.ReceptionPaywall

class BoundaryTest {
  @Test
  fun `FCM tokens pass and everything else is refused`() {
    assertTrue(PushToken.isValid("dXa1:APA91b-Hk_x"))
    assertFalse(PushToken.isValid(""))
    assertFalse(PushToken.isValid("token with spaces"))
    assertFalse(PushToken.isValid("a".repeat(4097)))
  }

  @Test
  fun `testing connects only to this machine`() {
    assertTrue(Loopback.isLoopback("http://localhost:3000"))
    assertTrue(Loopback.isLoopback("https://127.0.0.1"))
    assertTrue(Loopback.isLoopback("http://[::1]:3000"))
    assertFalse(Loopback.isLoopback("http://10.0.2.2:3000"))
    assertFalse(Loopback.isLoopback("https://reception.sh"))
    assertFalse(Loopback.isLoopback("ftp://localhost"))
    assertFalse(Loopback.isLoopback("not a url"))
  }

  @Test
  fun `paywalls round-trip in the JS shape`() {
    val entry = mapOf(
      "id" to "plans", "title" to "Plans", "source" to "revenuecat", "presentable" to false,
      "products" to listOf(mapOf("id" to "pro", "price" to "$4.99", "period" to "P1M")),
    )
    val paywall = PaywallValues.paywall(entry)!!
    assertEquals(ReceptionPaywall.Source.RevenueCat, paywall.source)
    assertEquals(entry, PaywallValues.value(paywall))
    assertEquals(mapOf("id" to "a", "title" to "A"), PaywallValues.value(PaywallValues.paywall(mapOf("id" to "a", "title" to "A"))!!))
    assertNull(PaywallValues.paywall(mapOf("id" to "a")))
  }

  @Test
  fun `appearance JSON becomes plain values`() {
    assertEquals(
      mapOf("accentColor" to mapOf("light" to "#FFFFFF", "dark" to "#000000"), "welcomeIconSize" to 44, "title" to null),
      JsonValues.parse("""{"accentColor":{"light":"#FFFFFF","dark":"#000000"},"welcomeIconSize":44,"title":null}"""),
    )
    assertNull(JsonValues.parse("[1]"))
  }
}
