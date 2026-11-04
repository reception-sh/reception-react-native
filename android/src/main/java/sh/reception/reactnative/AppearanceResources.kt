package sh.reception.reactnative

import android.content.Context
import android.graphics.Typeface
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.text.font.FontFamily
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import com.facebook.react.common.assets.ReactFontManager

/** Looks up the app's fonts and images by the names JS uses. */
internal object AppearanceResources {
  /**
   * A font family React Native knows: one registered with `ReactFontManager` (expo-font, `res/font` families) or an
   * `assets/fonts/<name>.ttf|.otf` file, the same lookup as `<Text style={{ fontFamily }}>`. Null for an unknown name,
   * which Android would otherwise draw in the default face.
   */
  fun font(context: Context, name: String): FontFamily? {
    val typeface = ReactFontManager.getInstance().getTypeface(name, Typeface.NORMAL, context.assets)
    if (typeface == Typeface.DEFAULT && name !in ReactFontManager.getInstance().customFontFamilies) return null
    return FontFamily(androidx.compose.ui.text.font.Typeface(typeface))
  }

  /** A drawable resource of the app by name, such as `logo` for `res/drawable/logo.png`. */
  fun image(context: Context, name: String): Painter? {
    if (name.isEmpty()) return null
    @Suppress("DiscouragedApi")
    val id = context.resources.getIdentifier(name, "drawable", context.packageName)
    if (id == 0) return null
    val drawable = ContextCompat.getDrawable(context, id) ?: return null
    if (drawable.intrinsicWidth <= 0 || drawable.intrinsicHeight <= 0) return null
    return BitmapPainter(drawable.toBitmap().asImageBitmap())
  }
}
