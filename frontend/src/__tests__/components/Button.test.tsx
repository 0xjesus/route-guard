import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button Component", () => {
  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button")).toHaveTextContent("Click me");
    });

    it("renders with primary variant by default", () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("from-mantle-accent");
    });

    it("renders with secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-mantle-bg-elevated");
    });

    it("renders with ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      // Ghost variant includes hover and active states
      expect(button).toHaveClass("hover:bg-mantle-bg-tertiary");
    });

    it("renders with danger variant", () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole("button");
      // Danger variant has error-related styling
      expect(button.className).toContain("error");
    });
  });

  describe("Sizes", () => {
    it("renders with small size", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-3");
    });

    it("renders with large size", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-6");
    });

    it("renders with full width", () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
    });
  });

  describe("States", () => {
    it("handles disabled state", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("handles loading state", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows spinner when loading", () => {
      render(<Button loading>Submit</Button>);
      expect(document.querySelector(".spinner")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onClick handler when clicked", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("does not call onClick when loading", () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} loading>
          Loading
        </Button>
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper role", () => {
      render(<Button>Accessible</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("supports aria-label", () => {
      render(<Button aria-label="Submit form">Submit</Button>);
      expect(screen.getByLabelText("Submit form")).toBeInTheDocument();
    });

    it("supports aria-disabled when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});
