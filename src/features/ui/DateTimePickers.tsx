import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/features/theme/ThemeContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDateString(year: number, monthIndex: number, day: number): string {
  return `${year}-${padZero(monthIndex + 1)}-${padZero(day)}`;
}

function parseDateString(str?: string): { year: number; month: number; day: number } {
  if (str && /^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
    const [y, m, d] = str.trim().split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function parseTimeString(str?: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  if (str) {
    const match = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i.exec(str.trim());
    if (match) {
      return {
        hour: parseInt(match[1], 10),
        minute: parseInt(match[2], 10),
        period: match[3].toUpperCase() as 'AM' | 'PM',
      };
    }
    const match24 = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(str.trim());
    if (match24) {
      const h24 = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      const period = h24 >= 12 ? 'PM' : 'AM';
      const hour = h24 % 12 === 0 ? 12 : h24 % 12;
      return { hour, minute: m, period };
    }
  }
  return { hour: 9, minute: 0, period: 'AM' };
}

function formatTimeString(hour: number, minute: number, period: 'AM' | 'PM'): string {
  return `${hour}:${padZero(minute)} ${period}`;
}

// ==========================================
// DATE PICKER MODAL
// ==========================================

export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (dateString: string) => void;
  initialDate?: string; // "YYYY-MM-DD"
  title?: string;
  minDate?: string; // "YYYY-MM-DD"
  maxDate?: string; // "YYYY-MM-DD"
  allowClear?: boolean;
}

export function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDate,
  title = 'Select Date',
  minDate,
  maxDate,
  allowClear = false,
}: DatePickerModalProps) {
  const { colors, isDark } = useTheme();

  const parsed = useMemo(() => parseDateString(initialDate), [initialDate, visible]);
  const [selectedYear, setSelectedYear] = useState(parsed.year);
  const [selectedMonth, setSelectedMonth] = useState(parsed.month);
  const [selectedDay, setSelectedDay] = useState(parsed.day);
  const [viewMode, setViewMode] = useState<'calendar' | 'years'>('calendar');

  useEffect(() => {
    if (visible) {
      const p = parseDateString(initialDate);
      setSelectedYear(p.year);
      setSelectedMonth(p.month);
      setSelectedDay(p.day);
      setViewMode('calendar');
    }
  }, [visible, initialDate]);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedYear, selectedMonth]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const selectedDateStr = useMemo(() => {
    const validDay = Math.min(selectedDay, daysInMonth);
    return formatDateString(selectedYear, selectedMonth, validDay);
  }, [selectedYear, selectedMonth, selectedDay, daysInMonth]);

  const formattedDisplay = useMemo(() => {
    const validDay = Math.min(selectedDay, daysInMonth);
    const d = new Date(selectedYear, selectedMonth, validDay);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }, [selectedYear, selectedMonth, selectedDay, daysInMonth]);

  function handlePrevMonth() {
    if (selectedMonth === 0) {
      setSelectedYear(y => y - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth(m => m - 1);
    }
  }

  function handleNextMonth() {
    if (selectedMonth === 11) {
      setSelectedYear(y => y + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth(m => m + 1);
    }
  }

  function isDateDisabled(day: number): boolean {
    const dateStr = formatDateString(selectedYear, selectedMonth, day);
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  }

  function handleConfirm() {
    const validDay = Math.min(selectedDay, daysInMonth);
    onSelect(formatDateString(selectedYear, selectedMonth, validDay));
    onClose();
  }

  function handleClear() {
    onSelect('');
    onClose();
  }

  // Generate list of years (1920 to current + 15)
  const currentYear = new Date().getFullYear();
  const yearsList = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear + 10; y >= 1920; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.secondary }]}>{title}</Text>
            <Text style={[styles.dateSelectedDisplay, { color: colors.ink }]}>{formattedDisplay}</Text>
          </View>

          {/* Navigation Bar */}
          <View style={styles.navRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={handlePrevMonth}
              style={[styles.navBtn, { backgroundColor: colors.pill }]}
            >
              <Feather name="chevron-left" size={20} color={colors.ink} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select year ${selectedYear}`}
              onPress={() => setViewMode(v => v === 'calendar' ? 'years' : 'calendar')}
              style={[styles.monthYearHeader, { backgroundColor: viewMode === 'years' ? (isDark ? '#142337' : '#EAF5FF') : colors.pill }]}
            >
              <Text style={[styles.monthYearText, { color: colors.ink }]}>
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </Text>
              <Feather name={viewMode === 'years' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.ink} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={handleNextMonth}
              style={[styles.navBtn, { backgroundColor: colors.pill }]}
            >
              <Feather name="chevron-right" size={20} color={colors.ink} />
            </Pressable>
          </View>

          {/* Calendar View vs Year Selector */}
          {viewMode === 'calendar' ? (
            <View style={styles.calendarContainer}>
              {/* Day of Week Headers */}
              <View style={styles.weekHeaderRow}>
                {WEEKDAY_NAMES.map((d, i) => (
                  <Text key={i} style={[styles.weekDayLabel, { color: colors.secondary }]}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Day Grid */}
              <View style={styles.daysGrid}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = day === selectedDay;
                  const dateStr = formatDateString(selectedYear, selectedMonth, day);
                  const isToday = dateStr === todayStr;
                  const disabled = isDateDisabled(day);

                  return (
                    <Pressable
                      key={`day-${day}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${MONTH_NAMES[selectedMonth]} ${day}, ${selectedYear}`}
                      accessibilityState={{ selected: isSelected, disabled }}
                      disabled={disabled}
                      onPress={() => setSelectedDay(day)}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: '#08B8BE', borderRadius: 999 },
                        !isSelected && isToday && { borderWidth: 1.5, borderColor: '#08B8BE', borderRadius: 999 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: colors.ink },
                          isSelected && { color: '#FFFFFF', fontWeight: '700' },
                          disabled && { color: isDark ? '#4B5563' : '#CBD5E1' },
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Quick Preset Buttons (for non-birthday dates) */}
              {(!maxDate || maxDate >= todayStr) && (
                <View style={styles.quickPresetsRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const now = new Date();
                      setSelectedYear(now.getFullYear());
                      setSelectedMonth(now.getMonth());
                      setSelectedDay(now.getDate());
                    }}
                    style={[styles.presetChip, { backgroundColor: colors.pill }]}
                  >
                    <Text style={[styles.presetChipText, { color: colors.ink }]}>Today</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      setSelectedYear(tom.getFullYear());
                      setSelectedMonth(tom.getMonth());
                      setSelectedDay(tom.getDate());
                    }}
                    style={[styles.presetChip, { backgroundColor: colors.pill }]}
                  >
                    <Text style={[styles.presetChipText, { color: colors.ink }]}>Tomorrow</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const nextW = new Date();
                      nextW.setDate(nextW.getDate() + 7);
                      setSelectedYear(nextW.getFullYear());
                      setSelectedMonth(nextW.getMonth());
                      setSelectedDay(nextW.getDate());
                    }}
                    style={[styles.presetChip, { backgroundColor: colors.pill }]}
                  >
                    <Text style={[styles.presetChipText, { color: colors.ink }]}>+1 Week</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.yearSelectorContainer}>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={true}>
                <View style={styles.yearsGrid}>
                  {yearsList.map(y => {
                    const isSelected = y === selectedYear;
                    return (
                      <Pressable
                        key={y}
                        accessibilityRole="button"
                        onPress={() => {
                          setSelectedYear(y);
                          setViewMode('calendar');
                        }}
                        style={[
                          styles.yearItem,
                          { backgroundColor: isSelected ? '#08B8BE' : colors.pill },
                        ]}
                      >
                        <Text
                          style={[
                            styles.yearItemText,
                            { color: isSelected ? '#FFFFFF' : colors.ink },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {y}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            {allowClear && (
              <Pressable
                accessibilityRole="button"
                onPress={handleClear}
                style={[styles.actionBtn, styles.clearBtn]}
              >
                <Text style={[styles.clearBtnText, { color: '#EF4444' }]}>Clear</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.actionBtn, { backgroundColor: colors.pill }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleConfirm}
              style={[styles.actionBtn, styles.confirmBtn]}
            >
              <Text style={styles.confirmBtnText}>Select Date</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// TIME PICKER MODAL
// ==========================================

export interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (timeString: string) => void;
  initialTime?: string; // "9:00 AM"
  title?: string;
}

const COMMON_TIME_PRESETS = [
  { label: 'Morning', time: '8:00 AM', hour: 8, minute: 0, period: 'AM' as const, icon: 'weather-sunset-up' },
  { label: 'Noon', time: '12:00 PM', hour: 12, minute: 0, period: 'PM' as const, icon: 'weather-sunny' },
  { label: 'Afternoon', time: '2:00 PM', hour: 2, minute: 0, period: 'PM' as const, icon: 'weather-sunny' },
  { label: 'Dinner', time: '6:00 PM', hour: 6, minute: 0, period: 'PM' as const, icon: 'weather-sunset-down' },
  { label: 'Night', time: '9:00 PM', hour: 9, minute: 0, period: 'PM' as const, icon: 'weather-night' },
  { label: 'Bedtime', time: '10:00 PM', hour: 10, minute: 0, period: 'PM' as const, icon: 'bed' },
];

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_STEP5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function TimePickerModal({
  visible,
  onClose,
  onSelect,
  initialTime,
  title = 'Select Dose Time',
}: TimePickerModalProps) {
  const { colors, isDark } = useTheme();

  const parsed = useMemo(() => parseTimeString(initialTime), [initialTime, visible]);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const [activeTab, setActiveTab] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (visible) {
      const p = parseTimeString(initialTime);
      setHour(p.hour);
      setMinute(p.minute);
      setPeriod(p.period);
      setActiveTab('hour');
    }
  }, [visible, initialTime]);

  const formattedTime = useMemo(() => {
    return formatTimeString(hour, minute, period);
  }, [hour, minute, period]);

  function handleConfirm() {
    onSelect(formattedTime);
    onClose();
  }

  function adjustMinute(delta: number) {
    setMinute(m => {
      let next = m + delta;
      if (next >= 60) next = 0;
      if (next < 0) next = 59;
      return next;
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.secondary }]}>{title}</Text>
          </View>

          {/* Big Interactive Digital Display */}
          <View style={styles.timeDisplayCard}>
            <View style={styles.timeDigitsRow}>
              {/* Hour segment */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Hour ${hour}`}
                onPress={() => setActiveTab('hour')}
                style={[
                  styles.timeSegment,
                  { backgroundColor: activeTab === 'hour' ? (isDark ? '#142337' : '#EAF5FF') : colors.pill },
                  activeTab === 'hour' && { borderColor: '#08B8BE', borderWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.timeDigitText,
                    { color: activeTab === 'hour' ? '#08B8BE' : colors.ink },
                  ]}
                >
                  {padZero(hour)}
                </Text>
                <Text style={[styles.timeSegmentSub, { color: colors.secondary }]}>HOUR</Text>
              </Pressable>

              <Text style={[styles.timeColon, { color: colors.ink }]}>:</Text>

              {/* Minute segment */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Minute ${padZero(minute)}`}
                onPress={() => setActiveTab('minute')}
                style={[
                  styles.timeSegment,
                  { backgroundColor: activeTab === 'minute' ? (isDark ? '#142337' : '#EAF5FF') : colors.pill },
                  activeTab === 'minute' && { borderColor: '#08B8BE', borderWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.timeDigitText,
                    { color: activeTab === 'minute' ? '#08B8BE' : colors.ink },
                  ]}
                >
                  {padZero(minute)}
                </Text>
                <Text style={[styles.timeSegmentSub, { color: colors.secondary }]}>MIN</Text>
              </Pressable>
            </View>

            {/* AM / PM Segmented Toggle */}
            <View style={[styles.periodToggle, { backgroundColor: colors.pill }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="AM"
                accessibilityState={{ selected: period === 'AM' }}
                onPress={() => setPeriod('AM')}
                style={[
                  styles.periodBtn,
                  period === 'AM' && { backgroundColor: '#08B8BE' },
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    { color: period === 'AM' ? '#FFFFFF' : colors.ink },
                    period === 'AM' && { fontWeight: '700' },
                  ]}
                >
                  AM
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="PM"
                accessibilityState={{ selected: period === 'PM' }}
                onPress={() => setPeriod('PM')}
                style={[
                  styles.periodBtn,
                  period === 'PM' && { backgroundColor: '#08B8BE' },
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    { color: period === 'PM' ? '#FFFFFF' : colors.ink },
                    period === 'PM' && { fontWeight: '700' },
                  ]}
                >
                  PM
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Schedule Presets */}
          <View style={styles.presetsSection}>
            <Text style={[styles.presetsTitle, { color: colors.secondary }]}>Quick Presets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
              {COMMON_TIME_PRESETS.map(p => {
                const isSelected = hour === p.hour && minute === p.minute && period === p.period;
                return (
                  <Pressable
                    key={p.time}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.label} ${p.time}`}
                    onPress={() => {
                      setHour(p.hour);
                      setMinute(p.minute);
                      setPeriod(p.period);
                    }}
                    style={[
                      styles.presetCard,
                      { backgroundColor: isSelected ? '#08B8BE' : colors.pill },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={p.icon as any}
                      size={18}
                      color={isSelected ? '#FFFFFF' : colors.ink}
                    />
                    <Text
                      style={[
                        styles.presetCardLabel,
                        { color: isSelected ? '#FFFFFF' : colors.secondary },
                      ]}
                    >
                      {p.label}
                    </Text>
                    <Text
                      style={[
                        styles.presetCardTime,
                        { color: isSelected ? '#FFFFFF' : colors.ink },
                      ]}
                    >
                      {p.time}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Hour vs Minute Grid Selection */}
          <View style={styles.selectorSection}>
            <View style={styles.tabToggleRow}>
              <Pressable
                onPress={() => setActiveTab('hour')}
                style={[
                  styles.selectorTab,
                  activeTab === 'hour' && { borderBottomColor: '#08B8BE', borderBottomWidth: 2 },
                ]}
              >
                <Text style={[styles.selectorTabText, { color: activeTab === 'hour' ? '#08B8BE' : colors.secondary }]}>
                  Select Hour
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('minute')}
                style={[
                  styles.selectorTab,
                  activeTab === 'minute' && { borderBottomColor: '#08B8BE', borderBottomWidth: 2 },
                ]}
              >
                <Text style={[styles.selectorTabText, { color: activeTab === 'minute' ? '#08B8BE' : colors.secondary }]}>
                  Select Minute
                </Text>
              </Pressable>
            </View>

            {activeTab === 'hour' ? (
              <View style={styles.numbersGrid}>
                {HOURS.map(h => {
                  const isSelected = h === hour;
                  return (
                    <Pressable
                      key={`h-${h}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${h} o'clock`}
                      onPress={() => {
                        setHour(h);
                        setActiveTab('minute');
                      }}
                      style={[
                        styles.numberCell,
                        { backgroundColor: isSelected ? '#08B8BE' : colors.pill },
                      ]}
                    >
                      <Text
                        style={[
                          styles.numberCellText,
                          { color: isSelected ? '#FFFFFF' : colors.ink },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {h}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View>
                <View style={styles.numbersGrid}>
                  {MINUTES_STEP5.map(m => {
                    const isSelected = m === minute;
                    return (
                      <Pressable
                        key={`m-${m}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${m} minutes`}
                        onPress={() => setMinute(m)}
                        style={[
                          styles.numberCell,
                          { backgroundColor: isSelected ? '#08B8BE' : colors.pill },
                        ]}
                      >
                        <Text
                          style={[
                            styles.numberCellText,
                            { color: isSelected ? '#FFFFFF' : colors.ink },
                            isSelected && { fontWeight: '700' },
                          ]}
                        >
                          {padZero(m)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Minute Steppers for exact custom minute */}
                <View style={styles.stepperRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Subtract 1 minute"
                    onPress={() => adjustMinute(-1)}
                    style={[styles.stepperBtn, { backgroundColor: colors.pill }]}
                  >
                    <Feather name="minus" size={18} color={colors.ink} />
                    <Text style={[styles.stepperBtnText, { color: colors.ink }]}>-1 min</Text>
                  </Pressable>
                  <Text style={[styles.currentMinuteLabel, { color: colors.ink }]}>
                    Exact: {padZero(minute)} m
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add 1 minute"
                    onPress={() => adjustMinute(1)}
                    style={[styles.stepperBtn, { backgroundColor: colors.pill }]}
                  >
                    <Feather name="plus" size={18} color={colors.ink} />
                    <Text style={[styles.stepperBtnText, { color: colors.ink }]}>+1 min</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.actionBtn, { backgroundColor: colors.pill }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.ink }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleConfirm}
              style={[styles.actionBtn, styles.confirmBtn]}
            >
              <Text style={styles.confirmBtnText}>Set Time</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// FORM FIELD COMPONENT WRAPPERS
// ==========================================

export interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  minDate?: string;
  maxDate?: string;
  allowClear?: boolean;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  title,
  minDate,
  maxDate,
  allowClear = false,
}: DatePickerFieldProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={() => setModalVisible(true)}
        style={[
          styles.fieldCard,
          { backgroundColor: colors.card || '#FFFFFF', borderColor: colors.border || '#E8EAF0' },
        ]}
      >
        <Text style={[styles.fieldLabel, { color: colors.secondary }]}>{label}</Text>
        <View style={styles.fieldValueRow}>
          <Text
            style={[
              styles.fieldValueText,
              { color: value ? colors.ink : '#8793A2' },
            ]}
          >
            {value || placeholder}
          </Text>
          <View style={[styles.fieldIconCircle, { backgroundColor: colors.pill }]}>
            <Feather name="calendar" size={18} color={colors.ink} />
          </View>
        </View>
      </Pressable>

      <DatePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={onChange}
        initialDate={value}
        title={title || label}
        minDate={minDate}
        maxDate={maxDate}
        allowClear={allowClear}
      />
    </>
  );
}

export interface TimePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
}

export function TimePickerField({
  label,
  value,
  onChange,
  placeholder = '9:00 AM',
  title,
}: TimePickerFieldProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={() => setModalVisible(true)}
        style={[
          styles.fieldCard,
          { backgroundColor: colors.card || '#FFFFFF', borderColor: colors.border || '#E8EAF0' },
        ]}
      >
        <Text style={[styles.fieldLabel, { color: colors.secondary }]}>{label}</Text>
        <View style={styles.fieldValueRow}>
          <Text
            style={[
              styles.fieldValueText,
              { color: value ? colors.ink : '#8793A2' },
            ]}
          >
            {value || placeholder}
          </Text>
          <View style={[styles.fieldIconCircle, { backgroundColor: colors.pill }]}>
            <Feather name="clock" size={18} color={colors.ink} />
          </View>
        </View>
      </Pressable>

      <TimePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={onChange}
        initialTime={value}
        title={title || label}
      />
    </>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateSelectedDisplay: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '700',
  },
  calendarContainer: {
    marginBottom: 10,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  yearSelectorContainer: {
    marginBottom: 10,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  yearItem: {
    width: '28%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  yearItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeDisplayCard: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  timeDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeSegment: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 84,
  },
  timeDigitText: {
    fontSize: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeSegmentSub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  timeColon: {
    fontSize: 30,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  periodToggle: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 3,
    gap: 4,
  },
  periodBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 18,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetsSection: {
    marginBottom: 14,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetsScroll: {
    gap: 8,
    paddingRight: 8,
  },
  presetCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 78,
    gap: 2,
  },
  presetCardLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  presetCardTime: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectorSection: {
    marginBottom: 16,
  },
  tabToggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 12,
  },
  selectorTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  selectorTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  numberCell: {
    width: '14%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  numberCellText: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  stepperBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  currentMinuteLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  clearBtn: {
    flex: 0.6,
    backgroundColor: '#FEE2E2',
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#08B8BE',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fieldCard: {
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  fieldValueText: {
    fontSize: 17,
    fontWeight: '600',
  },
  fieldIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
