import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import IconButton from "../ui/IconButton";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <IconButton
  icon={
    theme === "light" ? (
      <FiMoon size={18} />
    ) : (
      <FiSun size={18} />
    )
  }
  label="Toggle theme"
  onClick={toggleTheme}
  active={theme === "dark"}
/>
  );
}
