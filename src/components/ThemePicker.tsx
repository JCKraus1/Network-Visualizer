import { THEMES, THEME_NAMES } from '../themes';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemePicker() {
  const { themeName, setTheme } = useTheme();
  return (
    <div className="theme-picker">
      <div className="theme-picker-label">Theme</div>
      <div className="theme-swatches">
        {THEME_NAMES.map(name => {
          const t = THEMES[name];
          const active = name === themeName;
          return (
            <button
              key={name}
              className={`theme-swatch${active ? ' active' : ''}`}
              style={{ background: t.primary, boxShadow: active ? `0 0 0 2px #fff, 0 0 0 4px ${t.primary}` : undefined }}
              onClick={() => setTheme(name)}
              title={`${t.emoji} ${t.label} — ${t.desc}`}
            />
          );
        })}
      </div>
    </div>
  );
}
