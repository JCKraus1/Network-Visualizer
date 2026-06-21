import { THEMES, THEME_NAMES } from '../themes';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemePicker() {
  const { themeName, setTheme } = useTheme();
  return (
    <div className="theme-picker">
      <div className="theme-list">
        {THEME_NAMES.map(name => {
          const t = THEMES[name];
          const active = name === themeName;
          return (
            <button
              key={name}
              className={`theme-item${active ? ' active' : ''}`}
              style={active ? {
                background: `${t.primary}14`,
                borderColor: `${t.primary}55`,
                color: t.primary,
              } : undefined}
              onClick={() => setTheme(name)}
              title={t.desc}
            >
              <span className="theme-dot" style={{ background: t.primary }} />
              <span className="theme-name">{t.emoji} {t.label}</span>
              {active && <span className="theme-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
