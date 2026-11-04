package sh.reception.reactnative

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/** Parses the appearance JSON that JS validated into plain maps, lists, strings, numbers and booleans. */
internal object JsonValues {
  fun parse(json: String): Map<String, Any?>? = try {
    convert(JSONObject(json)) as? Map<String, Any?>
  } catch (_: JSONException) {
    null
  }

  private fun convert(value: Any?): Any? = when (value) {
    is JSONObject -> value.keys().asSequence().associateWith { convert(value.get(it)) }
    is JSONArray -> (0 until value.length()).map { convert(value.get(it)) }
    JSONObject.NULL -> null
    else -> value
  }
}
