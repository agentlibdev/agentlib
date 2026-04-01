export type Theme = "dark" | "light";

export function resolveInitialTheme(
  storedTheme: string | null,
  prefersDark: boolean
): Theme {
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
