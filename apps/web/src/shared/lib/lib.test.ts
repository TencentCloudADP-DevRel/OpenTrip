import { describe, expect, it } from "vitest";
import { formatMoney, sumMinor } from "./money";
import { stopNumbers } from "@/entities/trip";
import type { Stop } from "@/entities/stop";

describe("formatMoney", () => {
  it("formats JPY with the yen symbol and grouped integer", () => {
    expect(formatMoney(120000, "JPY")).toBe("¥120,000");
  });

  it("rounds to whole units", () => {
    expect(formatMoney(2775.5, "JPY")).toBe("¥2,776");
  });
});

describe("sumMinor", () => {
  it("sums amounts", () => {
    expect(sumMinor([100, 200, 50])).toBe(350);
  });
});

describe("stopNumbers", () => {
  it("numbers stops sequentially within each day", () => {
    const stops = [
      { id: "a", day: 1 },
      { id: "b", day: 1 },
      { id: "c", day: 2 },
    ] as Stop[];
    const nums = stopNumbers(stops);
    expect(nums.get("a")).toBe(1);
    expect(nums.get("b")).toBe(2);
    expect(nums.get("c")).toBe(1);
  });
});
