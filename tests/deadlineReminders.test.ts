import { describe, expect, it } from "vitest";
import { daysUntil, selectDueThreshold, REMINDER_THRESHOLDS_DAYS } from "../src/modules/notifications/deadlineReminders";

describe("selectDueThreshold — escalating deadline reminders", () => {
  it("does nothing while the deadline is further out than the largest threshold", () => {
    expect(selectDueThreshold(60, new Set())).toBeNull();
  });

  it("picks the nearest crossed threshold on a fresh deadline", () => {
    expect(selectDueThreshold(10, new Set())).toBe(14);
    expect(selectDueThreshold(30, new Set())).toBe(30);
    expect(selectDueThreshold(0, new Set())).toBe(0);
  });

  it("never re-sends a threshold that already fired", () => {
    expect(selectDueThreshold(10, new Set([30, 14]))).toBeNull();
  });

  it("advances to the next threshold once time passes", () => {
    expect(selectDueThreshold(5, new Set([30, 14]))).toBe(7);
  });

  it("an overdue deadline still fires at most one reminder per run", () => {
    expect(selectDueThreshold(-5, new Set())).toBe(REMINDER_THRESHOLDS_DAYS[REMINDER_THRESHOLDS_DAYS.length - 1]);
    expect(selectDueThreshold(-5, new Set(REMINDER_THRESHOLDS_DAYS))).toBeNull();
  });
});

describe("daysUntil", () => {
  it("rounds down to whole days", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const dueTomorrowMorning = new Date("2026-01-02T06:00:00Z");
    expect(daysUntil(dueTomorrowMorning, now)).toBe(0);
  });
});
