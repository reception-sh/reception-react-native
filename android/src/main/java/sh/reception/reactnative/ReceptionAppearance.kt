package sh.reception.reactnative

import android.content.Context
import android.content.res.Configuration
import android.util.Log
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import sh.reception.Reception

/** Applies the appearance JS validated to the SDK. Main thread only. */
internal object ReceptionAppearance {
  private var last: String? = null

  fun apply(json: String, context: Context) {
    val values = JsonValues.parse(json) ?: return
    last = json
    val accepted = values.toMutableMap()
    val previous = Reception.appearance
    val style = Reception.Appearance()
    val dark = when (values["preferredColorScheme"]) {
      "light" -> false
      "dark" -> true
      else -> context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK ==
        Configuration.UI_MODE_NIGHT_YES
    }
    fun color(key: String): Color? = ReceptionColor.decode(values[key])?.let { Color(if (dark) it.dark else it.light) }
    style.accentColor = color("accentColor")
    style.onAccentColor = color("onAccentColor")
    style.chatBackground = color("chatBackground")
    style.incomingBackground = color("incomingBackground")
    style.incomingForeground = color("incomingForeground")
    style.welcomeIconColor = color("welcomeIconColor")
    (values["title"] as? String)?.let { style.title = it }
    (values["welcomeTitle"] as? String)?.let { style.welcomeTitle = it }
    (values["welcomeText"] as? String)?.let { style.welcomeText = it }
    (values["showsCloseButton"] as? Boolean)?.let { style.showsCloseButton = it }
    (values["fadesOlderMessages"] as? Boolean)?.let { style.fadesOlderMessages = it }
    (values["hidesTitle"] as? Boolean)?.let { style.hidesTitle = it }
    (values["hidesWelcomeTitle"] as? Boolean)?.let { style.hidesWelcomeTitle = it }
    (values["hidesWelcomeText"] as? Boolean)?.let { style.hidesWelcomeText = it }
    (values["hidesPushStatus"] as? Boolean)?.let { style.hidesPushStatus = it }
    when (values["closeIcon"]) {
      "xmark" -> style.closeIcon = Reception.CloseIcon.XMARK
      "chevron.down" -> style.closeIcon = Reception.CloseIcon.CHEVRON_DOWN
      "arrow.down" -> style.closeIcon = Reception.CloseIcon.ARROW_DOWN
    }
    style.preferredColorScheme = when (values["preferredColorScheme"]) {
      "light" -> Reception.ColorScheme.LIGHT
      "dark" -> Reception.ColorScheme.DARK
      else -> null
    }
    style.fontDesign = Reception.FontDesign.entries.firstOrNull { it.name.lowercase() == values["fontDesign"] }
    (values["fontFamily"] as? String)?.let { name ->
      style.fontFamily = AppearanceResources.font(context, name) ?: run {
        Log.e(TAG, "Unregistered font ignored")
        accepted["fontFamily"] = ReceptionBridge.appearanceValues["fontFamily"]
        previous.fontFamily
      }
    }
    number(values["welcomeIconSize"])?.takeIf { it in 16.0..160.0 }?.let { style.welcomeIconSize = it.dp }
    number(values["welcomeIconCornerRadius"])?.takeIf { it in 0.0..80.0 }?.let { style.welcomeIconCornerRadius = it.dp }
    (values["welcomeIconOffset"] as? Map<*, *>)?.let { offset ->
      val x = number(offset["x"]) ?: return@let
      val y = number(offset["y"]) ?: return@let
      style.welcomeIconOffset = DpOffset(x.dp, y.dp)
    }
    (values["closeImage"] as? String)?.let { name ->
      style.closeImage = AppearanceResources.image(context, name) ?: run {
        Log.e(TAG, "Missing close image ignored")
        accepted["closeImage"] = ReceptionBridge.appearanceValues["closeImage"]
        previous.closeImage
      }
    }
    (values["welcomeIcon"] as? Map<*, *>)?.let { icon ->
      val symbol = icon["symbol"] as? String
      val image = (icon["image"] as? String)?.let { AppearanceResources.image(context, it) }
      style.welcomeIcon = when {
        icon["hidden"] == true -> Reception.WelcomeIcon.hidden
        symbol != null -> Reception.WelcomeIcon.symbol(symbol)
        image != null -> Reception.WelcomeIcon.image(image)
        else -> {
          Log.e(TAG, "Missing welcome icon ignored")
          accepted["welcomeIcon"] = ReceptionBridge.appearanceValues["welcomeIcon"]
          previous.welcomeIcon
        }
      }
    }
    ReceptionBridge.appearanceValues = accepted
    Reception.appearance = style
  }

  /** The SDK takes one color per property; a light/dark pair is resolved again when the system switches. */
  fun systemThemeChanged(context: Context) {
    last?.let { apply(it, context) }
  }

  private fun number(value: Any?): Float? = (value as? Number)?.toFloat()?.takeIf { it.isFinite() }

  private const val TAG = "Reception"
}
