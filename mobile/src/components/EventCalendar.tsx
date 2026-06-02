import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import type { CalendarEntry } from "../types/app";
import { darkPalette, palette } from "../theme/theme";

type EventCalendarProps = {
  month: string;
  selectedDate: string;
  entries: CalendarEntry[];
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
};

function monthMeta(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startOffset = firstDay.getDay();
  return { year, monthNum, daysInMonth, startOffset };
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNum] = month.split("-").map(Number);
  const next = new Date(year, monthNum - 1 + delta, 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function EventCalendar({ month, selectedDate, entries, onMonthChange, onSelectDate }: EventCalendarProps) {
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;
  const { year, monthNum, daysInMonth, startOffset } = monthMeta(month);

  const markedDates = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      set.add(entry.eventDate);
    }
    return set;
  }, [entries]);

  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => onMonthChange(shiftMonth(month, -1))} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => onMonthChange(shiftMonth(month, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <Text key={label} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }
          const dateKey = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = selectedDate === dateKey;
          const hasEvents = markedDates.has(dateKey);
          return (
            <Pressable
              key={dateKey}
              style={[styles.dayCell, isSelected && styles.daySelected]}
              onPress={() => onSelectDate(dateKey)}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
              {hasEvents ? <View style={[styles.dot, { backgroundColor: colors.brand }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    wrap: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1a2640" : "#f2f5fb",
    },
    navText: { fontSize: 22, fontWeight: "700", color: colors.ink },
    monthLabel: { fontSize: 16, fontWeight: "800", color: colors.ink },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4,
    },
    weekLabel: {
      width: `${100 / 7}%`,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "700",
      color: colors.inkSoft,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      gap: 2,
    },
    daySelected: {
      backgroundColor: isDark ? "#2b3f68" : "#ffe8ea",
    },
    dayText: { fontSize: 13, fontWeight: "700", color: colors.ink },
    dayTextSelected: { color: colors.brand },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
  });
}
