import { describe, it, expect } from 'vitest'
import { cn } from "@/utils/cn";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "truthy", false && "falsy")).toBe("base truthy");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });

  it("handles arrays", () => {
    expect(cn(["class1", "class2"])).toBe("class1 class2");
  });

  it("handles objects", () => {
    expect(cn({ class1: true, class2: false, class3: true })).toBe("class1 class3");
  });

  it("merges tailwind classes correctly", () => {
    // Later classes should override earlier ones
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles conflicting tailwind utilities", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles mixed inputs", () => {
    expect(
      cn(
        "base",
        ["array-class"],
        { "object-class": true },
        true && "conditional"
      )
    ).toBe("base array-class object-class conditional");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
    expect(cn(null, undefined, "")).toBe("");
  });

  it("preserves non-conflicting classes", () => {
    expect(cn("bg-red-500 text-white", "p-4 m-2")).toBe("bg-red-500 text-white p-4 m-2");
  });

  it("handles responsive variants", () => {
    expect(cn("md:px-4", "md:px-8")).toBe("md:px-8");
    expect(cn("px-2", "md:px-4", "lg:px-8")).toBe("px-2 md:px-4 lg:px-8");
  });

  it("handles state variants", () => {
    expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe("hover:bg-blue-500");
    expect(cn("focus:ring-2", "hover:bg-blue-500")).toBe("focus:ring-2 hover:bg-blue-500");
  });
});
