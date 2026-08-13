import { useColorScheme } from "react-native";
import { colors, type ThemeColors } from "./colors";

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return colors[scheme === "dark" ? "dark" : "light"];
}
