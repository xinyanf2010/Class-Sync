package expo.modules.screenstate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.PowerManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reports screen on/off via the ACTION_SCREEN_ON/OFF broadcasts. These fire
 * synchronously while the app is still alive, so the JS side can send its
 * SCREEN_OFF telemetry before the OS suspends the process.
 */
class ScreenStateModule : Module() {
  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("ScreenState")

    Events("onScreenState")

    Function("isScreenOn") {
      val pm = appContext.reactContext?.getSystemService(Context.POWER_SERVICE) as? PowerManager
      pm?.isInteractive ?: true
    }

    OnStartObserving {
      val ctx = appContext.reactContext ?: return@OnStartObserving
      val filter = IntentFilter().apply {
        addAction(Intent.ACTION_SCREEN_ON)
        addAction(Intent.ACTION_SCREEN_OFF)
      }
      receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          val state = if (intent.action == Intent.ACTION_SCREEN_ON) "on" else "off"
          sendEvent("onScreenState", mapOf("state" to state))
        }
      }
      ContextCompat.registerReceiver(ctx, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    OnStopObserving {
      receiver?.let { appContext.reactContext?.unregisterReceiver(it) }
      receiver = null
    }
  }
}
