package expo.modules.dosealarmaccess

import android.app.Notification as AndroidNotification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import expo.modules.notifications.service.interfaces.PresentationDelegate
import java.util.UUID

// SDK 57 extension point: keep Expo's persistence, delivery, response serialization and
// dismissal paths. Only presentation changes; no JS timer or media service is required.
class DoseNotificationsService : NotificationsService() {
  override fun getPresentationDelegate(context: Context): PresentationDelegate =
    RingingPresentationDelegate(context)
}

private class RingingPresentationDelegate(context: Context) : ExpoPresentationDelegate(context) {
  override suspend fun createNotification(
    notification: Notification,
    notificationBehavior: NotificationBehaviorRecord?
  ): AndroidNotification {
    val original = super.createNotification(notification, notificationBehavior)
    val request = notification.notificationRequest
    val data = request.content.body
    val owned = (request.identifier.startsWith("dosetracker:dose:") &&
      data?.optString("kind") == "medication-dose") || data?.optString("kind") == "reminder-test"
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !owned ||
      data?.optBoolean("alarmRinging") != true || notificationBehavior?.shouldPlaySound == false) return original

    // System-owned notification audio respects the existing channel's sound, volume,
    // vibration and DND controls. Opening the shade / volume keys can silence it.
    // OS timeout is essential: it still ends the alert if the app process dies.
    val token = UUID.randomUUID().toString()
    val stop = PendingIntent.getBroadcast(context, 0,
      Intent(context, StopRingingReceiver::class.java)
        .setData(Uri.Builder().scheme("dosetracker-stop").authority("notification")
          .appendPath(request.identifier).appendPath(token).build())
        .putExtra(StopRingingReceiver.TAG, request.identifier)
        .putExtra(StopRingingReceiver.TOKEN, token),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val action = AndroidNotification.Action.Builder(null, "Stop ringing", stop)
      .addExtras(Bundle().apply { putBoolean(StopRingingReceiver.ACTION, true) }).build()
    return AndroidNotification.Builder.recoverBuilder(context, original)
      .setCategory(AndroidNotification.CATEGORY_ALARM)
      .setTimeoutAfter(120_000L)
      .build().apply {
        flags = (flags or AndroidNotification.FLAG_INSISTENT) and AndroidNotification.FLAG_ONLY_ALERT_ONCE.inv()
        extras.putString(StopRingingReceiver.TOKEN, token)
        // Android shows at most three controls. Stop is always first, followed by
        // the existing Take and Snooze controls when the secure app lock allows them.
        actions = arrayOf(action) + (original.actions ?: emptyArray())
      }
  }
}
