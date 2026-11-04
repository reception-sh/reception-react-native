package sh.reception.reactnative

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReceptionColorTest {
  @Test
  fun `hex colors become opaque or keep their alpha`() {
    assertEquals(ReceptionColor(0xFF8A2BE2.toInt(), 0xFF8A2BE2.toInt()), ReceptionColor.decode("#8A2BE2"))
    assertEquals(0x80FF0000.toInt(), ReceptionColor.decode("#ff000080")?.light)
  }

  @Test
  fun `a pair keeps light and dark apart`() {
    val color = ReceptionColor.decode(mapOf("light" to "#FFFFFF", "dark" to "#000000"))
    assertEquals(ReceptionColor(0xFFFFFFFF.toInt(), 0xFF000000.toInt()), color)
  }

  @Test
  fun `malformed colors are ignored`() {
    listOf("red", "#FFF", "#GGGGGG", 12, null, mapOf("light" to "#FFFFFF"),
      mapOf("light" to "#FFFFFF", "dark" to "#000000", "extra" to "#000000")).forEach {
      assertNull(ReceptionColor.decode(it))
    }
  }
}
