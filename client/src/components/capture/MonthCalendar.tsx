import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Dots shown under a day before collapsing the rest into "+". */
const MAX_DOTS = 3;

type Props = {
  /** "YYYY-MM" */
  month: string;
  /** "YYYY-MM-DD" */
  selectedDate: string;
  /** Dot colors per "YYYY-MM-DD" day, one per event. */
  markers: Record<string, string[]>;
  onMonthChange: (month: string) => void;
  /** Tapping any day selects it; days with events also call this. */
  onSelectDate: (date: string) => void;
  onPressEvents?: (date: string) => void;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNum] = month.split("-").map(Number);
  const next = new Date(year, monthNum - 1 + delta, 1);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}`;
}

/** Always six full weeks (Sunday first), so the grid keeps its height and shows neighbouring days faded. */
function buildWeeks(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const first = new Date(year, monthNum - 1, 1);
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(year, monthNum - 1, 1 - first.getDay() + week * 7 + weekday);
      return { key: toDateKey(date), day: date.getDate(), inMonth: date.getMonth() === monthNum - 1 };
    })
  );
}

/** Full month grid with per-day event dots. */
export function MonthCalendar({ month, selectedDate, markers, onMonthChange, onSelectDate, onPressEvents }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const [year, monthNum] = month.split("-").map(Number);
  const todayKey = toDateKey(new Date());
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weeks = buildWeeks(month);

  function selectDay(key: string, inMonth: boolean) {
    if (!inMonth) onMonthChange(key.slice(0, 7));
    onSelectDate(key);
    if (markers[key]?.length) onPressEvents?.(key);
  }

  return (
    <View style={[styles.card, shadow.level1, { backgroundColor: c.surfaceCard, borderRadius: layout.radius.lg }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onMonthChange(shiftMonth(month, -1))}
          style={({ pressed }) => [styles.navBtn, { backgroundColor: pressed ? c.surfaceContainer : c.surfaceContainerLow }]}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={c.onSurface} />
        </Pressable>
        <Text style={[type.headlineSm, { color: c.onSurface }]}>{monthLabel}</Text>
        <Pressable
          onPress={() => onMonthChange(shiftMonth(month, 1))}
          style={({ pressed }) => [styles.navBtn, { backgroundColor: pressed ? c.surfaceContainer : c.surfaceContainerLow }]}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color={c.onSurface} />
        </Pressable>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((label) => (
          <Text key={label} style={[type.labelSm, styles.weekday, { color: c.onSurfaceVariant }]}>
            {label.toUpperCase()}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0].key} style={styles.row}>
          {week.map((cell) => {
            const selected = cell.key === selectedDate;
            const isToday = cell.key === todayKey;
            const dots = markers[cell.key] ?? [];
            return (
              <Pressable
                key={cell.key}
                onPress={() => selectDay(cell.key, cell.inMonth)}
                style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${cell.key}${dots.length ? `, ${dots.length} event${dots.length === 1 ? "" : "s"}` : ""}`}
              >
                <View
                  style={[
                    styles.dayBubble,
                    selected && { backgroundColor: c.primary },
                    !selected && isToday && { borderWidth: 1.5, borderColor: c.primary },
                  ]}
                >
                  <Text
                    style={[
                      type.labelLg,
                      { color: selected ? c.onPrimary : isToday ? c.primary : cell.inMonth ? c.onSurface : c.outlineVariant },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {dots.slice(0, MAX_DOTS).map((color, index) => (
                    <View key={index} style={[styles.dot, { backgroundColor: color, opacity: cell.inMonth ? 1 : 0.4 }]} />
                  ))}
                  {dots.length > MAX_DOTS ? <Text style={[styles.more, { color: c.onSurfaceVariant }]}>+</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 4 },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  // Equal flex columns rather than 14.28% widths, which round past 100% and wrap a day onto the next row.
  row: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center" },
  cell: { flex: 1, height: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  dayBubble: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dots: { flexDirection: "row", alignItems: "center", gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  more: { fontSize: 9, lineHeight: 10, fontWeight: "700" },
});
