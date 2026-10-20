Pod::Spec.new do |s|
  s.name           = 'DoseAlarmAccess'
  s.version        = '1.0.0'
  s.summary        = 'DoseTracker AlarmKit reminders'
  s.description    = 'Schedules opt-in AlarmKit alarms for DoseTracker medication reminders.'
  s.license        = 'MIT'
  s.author         = 'DoseTracker'
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # AlarmKit exists only on iOS 26+; weak-link so older iOS still launches.
  s.weak_frameworks = 'AlarmKit'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
