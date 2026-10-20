import CryptoKit
import ExpoModulesCore
#if canImport(AlarmKit)
import AlarmKit
import AppIntents
import SwiftUI
#endif

struct DoseAlarmRequest: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var sound: String = "default"
  @Field var hour: Int = 0
  @Field var minute: Int = 0
  // 0 = Sunday. nil with no dateMs means every day.
  @Field var weekdays: [Int]? = nil
  @Field var dateMs: Double? = nil
}

/// Stable AlarmKit IDs from DoseTracker's string identifiers, so reconciliation is idempotent.
func doseAlarmUUID(_ key: String) -> UUID {
  var bytes = Array(SHA256.hash(data: Data(key.utf8)).prefix(16))
  bytes[6] = (bytes[6] & 0x0F) | 0x50
  bytes[8] = (bytes[8] & 0x3F) | 0x80
  return UUID(uuid: (bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
    bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]))
}

public class DoseAlarmAccessModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DoseAlarmAccess")
    // iOS 26.1 supplies the system Stop button; earlier AlarmKit needs a deprecated API.
    Function("supportsRinging") { () -> Bool in
      if #available(iOS 26.1, *) { return true }
      return false
    }
    Function("alarmAuthorization") { () -> String in
      if #available(iOS 26.1, *) { return DoseAlarms.authorization() }
      return "unavailable"
    }
    AsyncFunction("requestAlarmAuthorization") { () async throws -> String in
      if #available(iOS 26.1, *) { return try await DoseAlarms.requestAuthorization() }
      return "unavailable"
    }
    AsyncFunction("scheduleAlarm") { (request: DoseAlarmRequest) async throws in
      if #available(iOS 26.1, *) { try await DoseAlarms.schedule(request) }
    }
    AsyncFunction("cancelAlarm") { (id: String) in
      if #available(iOS 26.1, *) { DoseAlarms.cancel(doseAlarmUUID(id)) }
    }
    AsyncFunction("cancelAlarmsExcept") { (ids: [String]) throws in
      if #available(iOS 26.1, *) { try DoseAlarms.cancelAll(except: Set(ids.map(doseAlarmUUID))) }
    }
    // Silences an alerting alarm only; a scheduled recurring alarm keeps its next occurrence.
    AsyncFunction("stopAlarm") { (id: String) throws in
      if #available(iOS 26.1, *) { try DoseAlarms.stop(doseAlarmUUID(id)) }
    }
  }
}

#if canImport(AlarmKit)
@available(iOS 26.1, *)
struct DoseAlarmMetadata: AlarmMetadata {}

/// Opens the app from the alarm and silences it. It never changes dose history.
@available(iOS 26.1, *)
struct OpenDoseTrackerIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Open DoseTracker"
  static let openAppWhenRun = true
  @Parameter(title: "Alarm ID") var alarmID: String

  init() { alarmID = "" }
  init(alarmID: UUID) { self.alarmID = alarmID.uuidString }

  func perform() async throws -> some IntentResult {
    if let id = UUID(uuidString: alarmID) { try? AlarmManager.shared.stop(id: id) }
    return .result()
  }
}

@available(iOS 26.1, *)
enum DoseAlarms {
  static func authorization() -> String {
    switch AlarmManager.shared.authorizationState {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    @unknown default: return "denied"
    }
  }

  static func requestAuthorization() async throws -> String {
    if AlarmManager.shared.authorizationState == .notDetermined {
      _ = try await AlarmManager.shared.requestAuthorization()
    }
    return authorization()
  }

  static func schedule(_ request: DoseAlarmRequest) async throws {
    let id = doseAlarmUUID(request.id)
    let schedule: Alarm.Schedule
    if let dateMs = request.dateMs {
      schedule = .fixed(Date(timeIntervalSince1970: dateMs / 1000))
    } else {
      let days: [Locale.Weekday] = [.sunday, .monday, .tuesday, .wednesday, .thursday, .friday, .saturday]
      let selected = (request.weekdays ?? Array(0...6)).filter { days.indices.contains($0) }.map { days[$0] }
      schedule = .relative(.init(time: .init(hour: request.hour, minute: request.minute), repeats: .weekly(selected)))
    }
    let open = AlarmButton(text: "Open", textColor: .white, systemImageName: "pills.fill")
    let alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: request.title),
      secondaryButton: open, secondaryButtonBehavior: .custom)
    let attributes = AlarmAttributes<DoseAlarmMetadata>(presentation: AlarmPresentation(alert: alert),
      tintColor: Color(red: 8 / 255, green: 184 / 255, blue: 190 / 255))
    // Replace rather than update: AlarmKit has no in-place edit for title, sound or schedule.
    cancel(id)
    _ = try await AlarmManager.shared.schedule(id: id, configuration: .alarm(schedule: schedule,
      attributes: attributes, secondaryIntent: OpenDoseTrackerIntent(alarmID: id),
      sound: request.sound == "default" ? .default : .named(request.sound)))
  }

  static func cancel(_ id: UUID) {
    try? AlarmManager.shared.cancel(id: id)
  }

  static func cancelAll(except keep: Set<UUID>) throws {
    for alarm in try AlarmManager.shared.alarms where !keep.contains(alarm.id) { cancel(alarm.id) }
  }

  static func stop(_ id: UUID) throws {
    if try AlarmManager.shared.alarms.contains(where: { $0.id == id && $0.state == .alerting }) {
      try AlarmManager.shared.stop(id: id)
    }
  }
}
#endif
