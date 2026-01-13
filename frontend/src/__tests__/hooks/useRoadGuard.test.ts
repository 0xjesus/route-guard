import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from "@testing-library/react";
import { generateCommitment, scaleCoordinate, useReporterIdentity } from "@/hooks/useRoadGuard";
import { keccak256, encodePacked } from "viem";

describe("useRoadGuard Hooks", () => {
  describe("generateCommitment", () => {
    it("generates deterministic commitment from passphrase", () => {
      const passphrase = "my_secret_passphrase";
      const result1 = generateCommitment(passphrase);
      const result2 = generateCommitment(passphrase);

      expect(result1.secret).toBe(result2.secret);
      expect(result1.commitment).toBe(result2.commitment);
    });

    it("generates different commitments for different passphrases", () => {
      const result1 = generateCommitment("passphrase1");
      const result2 = generateCommitment("passphrase2");

      expect(result1.commitment).not.toBe(result2.commitment);
    });

    it("returns valid hex strings", () => {
      const result = generateCommitment("test");

      expect(result.secret).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.commitment).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("commitment is derived from secret", () => {
      const passphrase = "test_passphrase";
      const result = generateCommitment(passphrase);

      // Verify the commitment is keccak256 of the secret
      const expectedCommitment = keccak256(encodePacked(["bytes32"], [result.secret]));
      expect(result.commitment).toBe(expectedCommitment);
    });
  });

  describe("scaleCoordinate", () => {
    it("scales latitude correctly", () => {
      const lat = 40.7128;
      const scaled = scaleCoordinate(lat);

      expect(scaled).toBe(BigInt(4071280000));
    });

    it("scales longitude correctly", () => {
      const lng = -74.006;
      const scaled = scaleCoordinate(lng);

      expect(scaled).toBe(BigInt(-7400600000));
    });

    it("handles zero", () => {
      expect(scaleCoordinate(0)).toBe(BigInt(0));
    });

    it("handles max latitude", () => {
      const scaled = scaleCoordinate(90);
      expect(scaled).toBe(BigInt(9000000000));
    });

    it("handles min latitude", () => {
      const scaled = scaleCoordinate(-90);
      expect(scaled).toBe(BigInt(-9000000000));
    });

    it("rounds to nearest integer", () => {
      const coord = 40.71285555;
      const scaled = scaleCoordinate(coord);
      // 40.71285555 * 1e8 = 4071285555 (rounds to nearest integer)
      expect(scaled).toBe(BigInt(4071285555));
    });
  });

  describe("useReporterIdentity", () => {
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    beforeEach(() => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      localStorageMock.getItem.mockClear();
      localStorageMock.setItem.mockClear();
      localStorageMock.removeItem.mockClear();
    });

    it("starts with null identity", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useReporterIdentity());

      expect(result.current.identity).toBe(null);
      expect(result.current.hasIdentity).toBe(false);
    });

    it("creates identity from passphrase", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useReporterIdentity());

      act(() => {
        result.current.createIdentity("test_passphrase");
      });

      expect(result.current.identity).not.toBe(null);
      expect(result.current.hasIdentity).toBe(true);
      expect(result.current.identity?.secret).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.current.identity?.commitment).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("saves identity to localStorage", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useReporterIdentity());

      act(() => {
        result.current.createIdentity("test");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "roadguard_identity",
        expect.any(String)
      );
    });

    it("loads identity from localStorage", () => {
      const storedIdentity = {
        secret: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        commitment: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedIdentity));

      const { result } = renderHook(() => useReporterIdentity());

      // Identity is auto-loaded on mount
      expect(result.current.identity).toEqual(storedIdentity);
      expect(result.current.hasIdentity).toBe(true);
    });

    it("clears identity", () => {
      const storedIdentity = {
        secret: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        commitment: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedIdentity));

      const { result } = renderHook(() => useReporterIdentity());

      act(() => {
        result.current.clearIdentity();
      });

      expect(result.current.identity).toBe(null);
      expect(result.current.hasIdentity).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("roadguard_identity");
    });
  });
});
