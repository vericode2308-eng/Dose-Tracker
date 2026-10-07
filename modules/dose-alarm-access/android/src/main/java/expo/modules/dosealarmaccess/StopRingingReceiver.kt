package expo.modules.dosealarmaccess

import android.app.Notification
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

/** Silencing needs no unlock and never reads or changes a dose, profile or snooze. */
class StopRingingReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val tag = intent.getStringExtra(TAG) ?: return
    val token = intent.getStringExtra(TOKEN) ?: return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val active = manager.activeNotifications.firstOrNull {
      it.tag == tag && it.notification.extras.getString(TOKEN) == token
    } ?: return // A stale button must not silence a later delivery with the same tag.
    val quiet = NotificationCompat.Builder(context, active.notification)
      .setSilent(true)
      .setOnlyAlertOnce(true)
      .setTimeoutAfter(0)
      .build().apply {
        flags = flags and Notification.FLAG_INSISTENT.inv()
        actions = actions?.filterNot { it.extras.getBoolean(ACTION) }?.toTypedArray()
        extras.remove(TOKEN)
      }
    // Cancel first to stop the system player, then repost silently. ONLY_ALERT_ONCE
    // alone does not reliably stop a looping sound on all Android versions.
    // Keep the original redacted content and Expo dose response extras in the tray.
    manager.cancel(tag, active.id)
    manager.notify(tag, active.id, quiet)
  }

  companion object {
    const val TAG = "doseRingingTag"
    const val TOKEN = "doseRingingToken"
    const val ACTION = "doseStopRinging"
  }
}
