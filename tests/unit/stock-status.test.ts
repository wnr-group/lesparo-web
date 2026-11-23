import { describe, expect, it } from "vitest";
import { liveQuantities, stockInfo, stockLabel } from "@/lib/inventory/status";

describe("stock status", () => {
  it("shows Only N left at or below the threshold, Out of stock at zero, nothing above it", () => {
    expect(stockLabel(stockInfo(true, 3, [3]))).toBe("Only 3 left");
    expect(stockLabel(stockInfo(true, 3, [1]))).toBe("Only 1 left");
    expect(stockLabel(stockInfo(true, 3, [0, 0]))).toBe("Out of stock");
    expect(stockLabel(stockInfo(true, 3, [4]))).toBeNull();
    expect(stockLabel(stockInfo(false, 3, [0]))).toBeNull();
  });

  it("the tag goes away by itself once stock is replenished above the threshold", () => {
    expect(stockLabel(stockInfo(true, 3, [2]))).toBe("Only 2 left");
    expect(stockLabel(stockInfo(true, 3, [20]))).toBeNull();
  });

  describe("liveQuantities: only sizes the product still offers count", () => {
    it("ignores stock left behind for a removed size", () => {
      const rows = [{ size: "M", quantity: 0 }, { size: "XL", quantity: 7 }];
      expect(liveQuantities(["M"], rows)).toEqual([0]);
      expect(stockInfo(true, 3, liveQuantities(["M"], rows)).level).toBe("out");
    });
    it("a size added later with no row yet counts as nothing", () => {
      expect(liveQuantities(["M", "L"], [{ size: "M", quantity: 4 }])).toEqual([4]);
    });
    it("a product without sizes uses its single no-size row only", () => {
      expect(liveQuantities([], [{ size: "", quantity: 6 }, { size: "M", quantity: 9 }])).toEqual([6]);
    });
    it("counts every offered size", () => {
      expect(liveQuantities(["M", "L"], [{ size: "M", quantity: 2 }, { size: "L", quantity: 5 }])).toEqual([2, 5]);
    });
  });
});
