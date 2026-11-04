package sh.reception.reactnative

import android.content.Context
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import sh.reception.ReceptionChatView

/**
 * The SDK's chat screen inside a React Native view, filling the frame React Native gives it. Keyboard insets reach the
 * composer through the window like in any Android screen.
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
      if (isAttachedToWindow) layoutChat(width, height)
    }
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    if (isAttachedToWindow) layoutChat(right - left, bottom - top)
  }

  private fun layoutChat(width: Int, height: Int) {
    chat.measure(
      View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY),
    )
    chat.layout(0, 0, width, height)
  }
}
