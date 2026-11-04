package sh.reception.reactnative

/** A JS appearance color: `#RRGGBB`, `#RRGGBBAA`, or `{ light, dark }` of those. Colors are ARGB integers. */
internal data class ReceptionColor(val light: Int, val dark: Int) {
  companion object {
    private val hex = Regex("^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")

    fun decode(value: Any?): ReceptionColor? {
      if (value is String) return decodeHex(value)?.let { ReceptionColor(it, it) }
      val pair = value as? Map<*, *> ?: return null
      if (pair.size != 2) return null
      val light = (pair["light"] as? String)?.let(::decodeHex) ?: return null
      val dark = (pair["dark"] as? String)?.let(::decodeHex) ?: return null
      return ReceptionColor(light, dark)
    }

    private fun decodeHex(text: String): Int? {
      if (!hex.matches(text)) return null
      val value = text.substring(1).toLong(16)
      val rgba = if (text.length == 7) (value shl 8) or 0xFF else value
      // RRGGBBAA to AARRGGBB.
      return ((rgba ushr 8) or ((rgba and 0xFF) shl 24)).toInt()
    }
  }
}
