package sh.reception.reactnative

import android.content.Context
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import sh.reception.ReceptionChatView

/**
 * The SDK's chat screen inside a React Native view, filling the frame React Native gives it. The window's insets reach
 * the chat unchanged: the SDK pads it only for the part of the keyboard and system bars that overlaps it, so the
 * composer sits on the keyboard also above a tab bar.
 */
internal class ReceptionNativeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // The activity's context lets the chat ask for notification permission from its card.
  private val chat = ReceptionChatView(appContext.currentActivity ?: context)
  private var layoutPosted = false

  init {
    addView(chat)
  }

  // React Native never measures native children, so a layout request from Compose is handled here. Expo's own
  // `shouldUseAndroidLayout` posts a measure that can run after the view left the window, where Compose throws.
  override fun requestLayout() {
    super.requestLayout()
    @Suppress("SENSELESS_COMPARISON") // Called by the superclass constructor before the fields exist.
    if (chat == null || layoutPosted) return
    layoutPosted = true
    post {
      layoutPosted = false
      if (chat.isAttachedToWindow) layoutChat(width, height)
    }
  }

  // React Native measures views that are not attached (clipped by `removeClippedSubviews`, or a subtree not yet in the
  // window). Measuring the Compose child there would create its composition without a window recomposer and throw, so
  // only the wrapper's size is recorded; the child is measured once attached.
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val width = View.MeasureSpec.getSize(widthMeasureSpec)
    val height = View.MeasureSpec.getSize(heightMeasureSpec)
    setMeasuredDimension(width, height)
    if (chat.isAttachedToWindow) measureChat(width, height)
  }

  // The child attaches after this callback, so its first layout is posted (see requestLayout).
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    requestLayout()
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    if (chat.isAttachedToWindow) layoutChat(right - left, bottom - top)
  }

  private fun measureChat(width: Int, height: Int) {
    chat.measure(
      View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY),
    )
  }

  private fun layoutChat(width: Int, height: Int) {
    measureChat(width, height)
    chat.layout(0, 0, width, height)
  }
}
