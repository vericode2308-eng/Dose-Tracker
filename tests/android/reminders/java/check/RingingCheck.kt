package check
import android.app.*
import android.content.*
import android.media.AudioAttributes
import android.os.*
import android.provider.Settings
import expo.modules.notifications.notifications.model.NotificationContent
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.notifications.model.NotificationCategory
import expo.modules.notifications.notifications.model.NotificationAction
import expo.modules.notifications.service.delegates.SharedPreferencesNotificationCategoriesStore
import expo.modules.notifications.notifications.triggers.TimeIntervalTrigger
import expo.modules.notifications.notifications.triggers.DateTrigger
import expo.modules.notifications.notifications.triggers.DailyTrigger
import expo.modules.notifications.service.delegates.ExpoSchedulingDelegate
import expo.modules.notifications.service.NotificationsService
import org.json.JSONObject
import java.util.Calendar

class RingingCheck : Instrumentation() {
  private var phase = "stop"
  private val tag = "dosetracker:dose:emulator-ringing-check"
  private val channel = "emulator-ringing-check-v1"
  private val nm get() = targetContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  override fun onCreate(args: Bundle?) { super.onCreate(args); phase = args?.getString("phase") ?: "stop"; start() }
  private fun report(message: String) { sendStatus(0, Bundle().apply { putString("stream", "\n$message\n") }) }
  private fun current() = nm.activeNotifications.firstOrNull { it.tag == tag }?.notification
  private fun waitFor(message: String, timeout: Long = 10000, condition: () -> Boolean) {
    val until = SystemClock.elapsedRealtime() + timeout
    while (!condition()) { check(SystemClock.elapsedRealtime() < until) { message }; Thread.sleep(100) }
  }
  private fun request(ringing: Boolean = true, seconds: Long = 1) {
    val content = NotificationContent.Builder().setTitle("DoseTracker")
      .setText("Emulator reminder check — no dose records")
      .setBody(JSONObject().put("kind", "reminder-test").put("alarmRinging", ringing)).useDefaultSound()
    if (phase == "actions") content.setCategoryId("emulator-ringing-actions")
    val trigger = when (phase) {
      "daily" -> Calendar.getInstance().apply { add(Calendar.MINUTE, 1) }.let { DailyTrigger(channel, it[Calendar.HOUR_OF_DAY], it[Calendar.MINUTE]) }
      "date" -> DateTrigger(channel, System.currentTimeMillis() + 5000)
      else -> TimeIntervalTrigger(if (phase == "silent") "$channel-silent" else channel, seconds, false)
    }
    NotificationsService.schedule(targetContext, NotificationRequest(tag, content.build(), trigger))
  }
  private fun shell(command: String): String = uiAutomation.executeShellCommand(command).use { fd ->
    java.io.FileInputStream(fd.fileDescriptor).bufferedReader().readText()
  }
  private fun soundPlaying(): Boolean = shell("dumpsys notification").lineSequence().any { it.contains("mSoundNotificationKey=") && it.contains(tag) }
  override fun onStart() {
    try {
      val chosen = targetContext.packageManager.queryBroadcastReceivers(Intent(NotificationsService.NOTIFICATION_EVENT_ACTION).setPackage(targetContext.packageName), 0).first().activityInfo.name
      check(chosen.endsWith("DoseNotificationsService")) { "Wrong receiver: $chosen" }
      nm.createNotificationChannel(NotificationChannel(channel, "Emulator reminder check", NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(Settings.System.DEFAULT_NOTIFICATION_URI, AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build())
        enableVibration(true)
      })
      if (phase != "inspect") nm.cancel(tag, 0)
      if (phase == "actions") SharedPreferencesNotificationCategoriesStore(targetContext).saveNotificationCategory(
        NotificationCategory("emulator-ringing-actions", listOf(
          NotificationAction("take-now", "Take Now", false), NotificationAction("snooze-15", "Snooze 15m", false), NotificationAction("skip", "Skip", false))))
      when (phase) {
        "cleanup" -> {
          NotificationsService.removeScheduledNotification(targetContext, tag)
          nm.deleteNotificationChannel(channel)
          nm.deleteNotificationChannel("$channel-silent")
          SharedPreferencesNotificationCategoriesStore(targetContext).removeNotificationCategory("emulator-ringing-actions")
          Thread.sleep(500)
          report("PASS removed only emulator test reminders, channels and category")
        }
        "schedule" -> { request(seconds = 12); Thread.sleep(1000); report("SCHEDULED for 12 seconds; test can finish before delivery") }
        "inspect" -> { val n = current() ?: error("No delivered alert"); check(soundPlaying()); check(n.flags and android.app.Notification.FLAG_INSISTENT != 0); report("PASS delivery after test process ended: flags=${n.flags}, timeout=${n.timeoutAfter}, actions=${n.actions?.map { it.title }}, sound=${soundPlaying()}") }
        "silent" -> {
          nm.createNotificationChannel(NotificationChannel("$channel-silent", "Emulator silent check", NotificationManager.IMPORTANCE_HIGH).apply { setSound(null, null); enableVibration(false) })
          request(); waitFor("No silent alert") { current()!=null }; Thread.sleep(2000)
          check(!soundPlaying()); report("PASS muted channel is respected even with ringing requested")
        }
        "stop", "actions", "daily", "date", "screen-off", "shade", "timeout", "timeout-off", "volume", "power", "single", "stale" -> {
          if (phase == "screen-off" || phase == "timeout-off") shell("input keyevent KEYCODE_SLEEP")
          request(ringing = phase != "single")
          waitFor("No native reminder delivered", if (phase == "daily") 90000 else 15000) { current() != null }
          val n = current()!!
          if (phase == "single") {
            check(n.flags and android.app.Notification.FLAG_INSISTENT == 0)
            check(n.actions?.any { it.title == "Stop ringing" } != true)
            report("PASS single-alert mode: no looping flag or Stop control")
          } else {
            check(n.flags and android.app.Notification.FLAG_INSISTENT != 0) { "Looping flag missing" }
            check(n.timeoutAfter == 120000L) { "Cutoff missing" }
            check(n.actions.first().title == "Stop ringing") { "Stop not first" }
            waitFor("Notification sound did not start") { soundPlaying() }
            Thread.sleep(7000)
            check(soundPlaying()) { "Sound was not sustained" }
            report("PASS native delivery: looping sound remains active after 7 seconds, Stop first, 120-second timeout")
            when (phase) {
              "stop", "actions", "daily", "date", "screen-off" -> {
                n.actions.first().actionIntent.send()
                waitFor("Stop did not silence sound") { !soundPlaying() }
                waitFor("Stop did not preserve a quiet usable notification") { current()?.let { it.flags and android.app.Notification.FLAG_INSISTENT == 0 && it.timeoutAfter == 0L } == true }
                check(current()!!.actions?.any { it.title == "Stop ringing" } != true)
                check(current()!!.extras.getString(android.app.Notification.EXTRA_TEXT) == "Emulator reminder check — no dose records")
                if (phase == "actions") {
                  val kept = current()!!.actions
                  check(kept.map { it.title.toString() } == listOf("Take Now", "Snooze 15m", "Skip"))
                  check(kept.map { it.actionIntent } == n.actions.drop(1).map { it.actionIntent })
                  check(current()!!.extras.keySet().filter { it.contains("notification", true) }.isNotEmpty())
                  report("PASS original Take/Snooze/Skip PendingIntents survive native Stop unchanged")
                }
                report("PASS native Stop: sound stopped, content preserved, looping/timeout/Stop removed")
                if (phase == "daily") {
                  val trigger = ExpoSchedulingDelegate(targetContext).getScheduledNotification(tag)?.trigger as? DailyTrigger
                  check(trigger != null && trigger.nextTriggerDate()!!.time > System.currentTimeMillis() + 23 * 60 * 60 * 1000L)
                  report("PASS daily reminder delivered and retained its next daily occurrence after Stop")
                }
                if (phase == "date") {
                  check(ExpoSchedulingDelegate(targetContext).getScheduledNotification(tag) == null)
                  report("PASS one-shot date/snooze trigger delivered and was not repeated")
                }
              }
              "volume" -> { shell("input keyevent KEYCODE_VOLUME_DOWN"); waitFor("Volume key did not silence") { !soundPlaying() }; check(current() != null); report("PASS volume-down silences audio and retains notification") }
              "power" -> { shell("input keyevent KEYCODE_POWER"); Thread.sleep(1500); report("OBSERVED power button: soundPlaying=${soundPlaying()}, notificationPresent=${current()!=null}"); shell("input keyevent KEYCODE_WAKEUP") }
              "shade" -> { shell("cmd statusbar expand-notifications"); waitFor("Opening shade did not silence") { !soundPlaying() }; check(current()!=null); shell("cmd statusbar collapse"); report("PASS opening shade silences audio and retains notification") }
              "timeout", "timeout-off" -> {
                for (i in 1..4) {
                  Thread.sleep(25000)
                  val audible = soundPlaying()
                  report("Timeout check: ${7+i*25} seconds elapsed, present=${current()!=null}, sound=$audible")
                  if (phase == "timeout-off") check(audible && current()!=null) { "Ringing ended before cutoff; inspect OS events for an interruption" }
                }
                waitFor("Two-minute timeout failed", 20000) { current() == null && !soundPlaying() }
                report("PASS two-minute OS cutoff: notification cleared and sound stopped")
              }
              "stale" -> {
                val old = n.actions.first().actionIntent
                nm.cancel(tag, 0); request(); waitFor("Second delivery missing") { current()!=null }
                val token = current()!!.extras.getString("doseRingingToken")
                check(token != n.extras.getString("doseRingingToken"))
                old.send(); Thread.sleep(700)
                check(current()?.extras?.getString("doseRingingToken") == token)
                check(current()!!.flags and android.app.Notification.FLAG_INSISTENT != 0)
                report("PASS stale Stop cannot cancel later occurrence")
              }
            }
          }
        }
      }
      if (phase != "schedule") nm.cancel(tag, 0)
      if (phase == "daily") { NotificationsService.removeScheduledNotification(targetContext, tag); Thread.sleep(500) }
      if (phase == "screen-off" || phase == "timeout-off") shell("input keyevent KEYCODE_WAKEUP")
      finish(Activity.RESULT_OK, Bundle().apply { putString("stream", "\nPASS phase=$phase\n") })
    } catch (e: Throwable) {
      nm.cancel(tag, 0)
      finish(Activity.RESULT_CANCELED, Bundle().apply { putString("stream", "\nFAIL phase=$phase: ${e.stackTraceToString()}\n") })
    }
  }
}
