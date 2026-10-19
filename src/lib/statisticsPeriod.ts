import { localDay, validSessionDay } from "./personalProgress";

export type StatisticsPeriod = "7" | "30" | "all" | "custom";
export function shiftLocalDay(day: string, amount: number) {
  const date = new Date(day + "T12:00:00");
  date.setDate(date.getDate() + amount);
  return localDay(date);
}
export function rangeDayCount(from: string, to: string) {
  const ordinal = (day: string) => {
    const [y, m, d] = day.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ordinal(to) - ordinal(from)) / 86_400_000) + 1;
}
export function validStatisticsRange(from: string, to: string, today: string) {
  return (
    validSessionDay(from) && validSessionDay(to) && from <= to && to <= today
  );
}
export function resolveStatisticsPeriod(
  params: URLSearchParams,
  now = new Date(),
) {
  const today = localDay(now);
  const requested = params.get("period");
  const period: StatisticsPeriod =
    requested === "30" || requested === "all" || requested === "custom"
      ? requested
      : "7";
  if (period === "all")
    return { period, from: null, to: today, days: null, invalid: false };
  if (period === "custom") {
    const from = params.get("from") || "",
      to = params.get("to") || "";
    if (validStatisticsRange(from, to, today))
      return {
        period,
        from,
        to,
        days: rangeDayCount(from, to),
        invalid: false,
      };
    return {
      period: "7" as const,
      from: shiftLocalDay(today, -6),
      to: today,
      days: 7,
      invalid: true,
    };
  }
  const end = params.get("end");
  const validEnd = !end || (validSessionDay(end) && end <= today);
  const to = validEnd && end ? end : today;
  const days = Number(period);
  return {
    period,
    from: shiftLocalDay(to, 1 - days),
    to,
    days,
    invalid: !validEnd,
  };
}
