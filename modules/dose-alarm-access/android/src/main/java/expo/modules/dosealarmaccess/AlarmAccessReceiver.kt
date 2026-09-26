package expo.modules.dosealarmaccess

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import expo.modules.notifications.service.delegates.ExpoSchedulingDelegate
import java.util.concurrent.Executors

// Version-pinned Expo integration: re-arm its persisted recurring requests without JS.
// Expo's own receiver handles boot and package replacement.
class AlarmAccessReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action !in setOf("android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED",
        Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_TIME_CHANGED)) return
    val pending = goAsync()
    executor.execute {
      try { ExpoSchedulingDelegate(context.applicationContext).setupScheduledNotifications() }
      catch (error: Exception) { Log.e("DoseTracker", "Alarm reconciliation failed", error) }
      finally { pending.finish() }
    }
  }
  companion object { private val executor = Executors.newSingleThreadExecutor() }
}
