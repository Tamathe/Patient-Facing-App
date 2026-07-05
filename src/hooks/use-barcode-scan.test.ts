import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useBarcodeScan, type BarcodeDetectorLike } from "./use-barcode-scan";

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function fakeVideoRef() {
  return { current: { readyState: 4 } as HTMLVideoElement };
}

describe("useBarcodeScan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires once after two consecutive detections of the same barcode", async () => {
    const onBarcode = vi.fn();
    let results: Array<{ rawValue: string }> = [{ rawValue: "051000012616" }];
    const detector: BarcodeDetectorLike = { detect: async () => results };
    const detectorFactory = async () => detector;

    const { result } = renderHook(() =>
      useBarcodeScan({ videoRef: fakeVideoRef(), enabled: true, onBarcode, detectorFactory })
    );

    await advance(500);
    expect(onBarcode).not.toHaveBeenCalled();

    await advance(500);
    expect(onBarcode).toHaveBeenCalledTimes(1);
    expect(onBarcode).toHaveBeenCalledWith("051000012616");
    expect(result.current.activeBarcode).toBe("051000012616");

    await advance(2000);
    expect(onBarcode).toHaveBeenCalledTimes(1);

    results = [];
    await advance(5000);
    expect(result.current.activeBarcode).toBeNull();
  });

  it("does nothing when disabled", async () => {
    const onBarcode = vi.fn();
    const detector: BarcodeDetectorLike = { detect: async () => [{ rawValue: "1" }] };
    renderHook(() =>
      useBarcodeScan({ videoRef: fakeVideoRef(), enabled: false, onBarcode, detectorFactory: async () => detector })
    );

    await advance(2000);
    expect(onBarcode).not.toHaveBeenCalled();
  });
});
