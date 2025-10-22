"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const icon = mounted ? (
    isDark ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Moon className="h-4 w-4" />
    )
  ) : (
    <Sun className="h-4 w-4" />
  );

  return (
    <Button
      variant="outline"
      size={showLabel ? "default" : "icon"}
      onClick={handleToggle}
      aria-label="Toggle theme"
      className={className}
    >
      {icon}
      {showLabel && (
        <span className="ml-2 text-sm">
          {isDark ? "Switch to Light" : "Switch to Dark"}
        </span>
      )}
    </Button>
  );
}
