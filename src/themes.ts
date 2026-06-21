import type { DeviceCategory, DeviceStatus } from './types';

export type ThemeName =
  | 'futuristic' | 'professional' | 'corporate'
  | 'matrix' | 'sunset' | 'arctic'
  | 'crimson' | 'forest' | 'midnight-gold';

export interface ThemeCategory {
  label: string;
  color: string;
  bg: string;
}

export interface ThemeConfig {
  label: string;
  emoji: string;
  desc: string;
  primary: string;
  light?: boolean;
  cssVars: Record<string, string>;
  categories: Record<DeviceCategory, ThemeCategory>;
  statusColors: Record<DeviceStatus, string>;
  gridColor: string;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  futuristic: {
    label: 'Futuristic', emoji: '🛸', desc: 'Electric neon on void black',
    primary: '#00d4ff',
    cssVars: {
      '--bg-void': '#010810', '--bg-dark': '#020c1b', '--bg-panel': '#030d1e',
      '--bg-card': 'rgba(3,11,24,0.96)', '--bg-surface': 'rgba(5,16,34,0.94)',
      '--border-dim': 'rgba(0,212,255,0.07)', '--border-soft': 'rgba(0,212,255,0.14)', '--border-accent': 'rgba(0,212,255,0.35)',
      '--text-bright': '#daeeff', '--text-primary': '#8db8d8', '--text-dim': '#304a64',
      '--neon-primary': '#00d4ff',
    },
    categories: {
      network:       { label: 'Network',       color: '#00d4ff', bg: 'rgba(0,36,64,0.9)'   },
      computer:      { label: 'Computers',     color: '#4d9fff', bg: 'rgba(0,20,58,0.9)'   },
      mobile:        { label: 'Mobile',        color: '#c04dff', bg: 'rgba(28,0,60,0.9)'   },
      entertainment: { label: 'Entertainment', color: '#ff6b35', bg: 'rgba(44,10,0,0.9)'   },
      'smart-home':  { label: 'Smart Home',    color: '#00ff88', bg: 'rgba(0,36,18,0.9)'   },
      peripheral:    { label: 'Peripherals',   color: '#ffd700', bg: 'rgba(40,28,0,0.9)'   },
    },
    statusColors: { active: '#00ff88', online: '#00d4ff', idle: '#ff9f1c', offline: '#2a3d56' },
    gridColor: 'rgba(0,212,255,0.04)',
  },

  professional: {
    label: 'Professional', emoji: '💼', desc: 'Refined steel blue on dark slate',
    primary: '#5b8fc9',
    cssVars: {
      '--bg-void': '#090d18', '--bg-dark': '#0c1222', '--bg-panel': '#0f1628',
      '--bg-card': 'rgba(12,18,36,0.97)', '--bg-surface': 'rgba(15,22,40,0.95)',
      '--border-dim': 'rgba(91,143,201,0.08)', '--border-soft': 'rgba(91,143,201,0.15)', '--border-accent': 'rgba(91,143,201,0.4)',
      '--text-bright': '#e8edf5', '--text-primary': '#7a96b8', '--text-dim': '#384a64',
      '--neon-primary': '#5b8fc9',
    },
    categories: {
      network:       { label: 'Network',       color: '#5b8fc9', bg: 'rgba(20,40,80,0.8)'  },
      computer:      { label: 'Computers',     color: '#7aa8d4', bg: 'rgba(18,35,72,0.8)'  },
      mobile:        { label: 'Mobile',        color: '#8b7fba', bg: 'rgba(35,28,70,0.8)'  },
      entertainment: { label: 'Entertainment', color: '#b08870', bg: 'rgba(52,30,18,0.8)'  },
      'smart-home':  { label: 'Smart Home',    color: '#5a9f7a', bg: 'rgba(18,46,30,0.8)'  },
      peripheral:    { label: 'Peripherals',   color: '#a09060', bg: 'rgba(46,36,16,0.8)'  },
    },
    statusColors: { active: '#5b8fc9', online: '#7aa8d4', idle: '#a09060', offline: '#283a52' },
    gridColor: 'rgba(91,143,201,0.05)',
  },

  corporate: {
    label: 'Corporate', emoji: '🏢', desc: 'Navy authority on midnight',
    primary: '#1d6ead',
    cssVars: {
      '--bg-void': '#04080f', '--bg-dark': '#060c18', '--bg-panel': '#081020',
      '--bg-card': 'rgba(6,12,24,0.98)', '--bg-surface': 'rgba(8,16,30,0.97)',
      '--border-dim': 'rgba(29,110,173,0.1)', '--border-soft': 'rgba(29,110,173,0.2)', '--border-accent': 'rgba(29,110,173,0.5)',
      '--text-bright': '#f0f4fa', '--text-primary': '#6888aa', '--text-dim': '#28384e',
      '--neon-primary': '#1d6ead',
    },
    categories: {
      network:       { label: 'Network',       color: '#1d6ead', bg: 'rgba(10,30,60,0.9)'  },
      computer:      { label: 'Computers',     color: '#2980b9', bg: 'rgba(8,25,55,0.9)'   },
      mobile:        { label: 'Mobile',        color: '#8e44ad', bg: 'rgba(30,10,55,0.9)'  },
      entertainment: { label: 'Entertainment', color: '#c0392b', bg: 'rgba(40,8,8,0.9)'    },
      'smart-home':  { label: 'Smart Home',    color: '#27ae60', bg: 'rgba(5,35,15,0.9)'   },
      peripheral:    { label: 'Peripherals',   color: '#d4ac0d', bg: 'rgba(35,25,0,0.9)'   },
    },
    statusColors: { active: '#27ae60', online: '#2980b9', idle: '#d4ac0d', offline: '#2c3e50' },
    gridColor: 'rgba(29,110,173,0.04)',
  },

  matrix: {
    label: 'Matrix', emoji: '💻', desc: 'Phosphor green on void black',
    primary: '#00ff41',
    cssVars: {
      '--bg-void': '#000200', '--bg-dark': '#000500', '--bg-panel': '#000800',
      '--bg-card': 'rgba(0,5,0,0.97)', '--bg-surface': 'rgba(0,8,2,0.97)',
      '--border-dim': 'rgba(0,255,65,0.07)', '--border-soft': 'rgba(0,255,65,0.14)', '--border-accent': 'rgba(0,255,65,0.4)',
      '--text-bright': '#00ff41', '--text-primary': '#00a825', '--text-dim': '#003a0d',
      '--neon-primary': '#00ff41',
    },
    categories: {
      network:       { label: 'Network',       color: '#00ff41', bg: 'rgba(0,30,8,0.9)'    },
      computer:      { label: 'Computers',     color: '#00dd38', bg: 'rgba(0,26,6,0.9)'    },
      mobile:        { label: 'Mobile',        color: '#7fff00', bg: 'rgba(15,28,0,0.9)'   },
      entertainment: { label: 'Entertainment', color: '#39ff14', bg: 'rgba(5,24,0,0.9)'    },
      'smart-home':  { label: 'Smart Home',    color: '#00c032', bg: 'rgba(0,22,8,0.9)'    },
      peripheral:    { label: 'Peripherals',   color: '#adff2f', bg: 'rgba(12,22,0,0.9)'   },
    },
    statusColors: { active: '#00ff41', online: '#00c032', idle: '#7fff00', offline: '#003a0d' },
    gridColor: 'rgba(0,255,65,0.05)',
  },

  sunset: {
    label: 'Synthwave', emoji: '🌅', desc: 'Neon pink on purple void',
    primary: '#ff0080',
    cssVars: {
      '--bg-void': '#0d0018', '--bg-dark': '#140022', '--bg-panel': '#180028',
      '--bg-card': 'rgba(16,0,28,0.97)', '--bg-surface': 'rgba(20,0,34,0.97)',
      '--border-dim': 'rgba(255,0,128,0.07)', '--border-soft': 'rgba(255,0,128,0.14)', '--border-accent': 'rgba(255,0,128,0.4)',
      '--text-bright': '#ffe8f8', '--text-primary': '#c870a8', '--text-dim': '#5a2048',
      '--neon-primary': '#ff0080',
    },
    categories: {
      network:       { label: 'Network',       color: '#ff0080', bg: 'rgba(40,0,24,0.9)'  },
      computer:      { label: 'Computers',     color: '#bf5fff', bg: 'rgba(30,0,46,0.9)'  },
      mobile:        { label: 'Mobile',        color: '#7b2fff', bg: 'rgba(18,0,50,0.9)'  },
      entertainment: { label: 'Entertainment', color: '#ff6b35', bg: 'rgba(44,12,0,0.9)'  },
      'smart-home':  { label: 'Smart Home',    color: '#ff3864', bg: 'rgba(40,0,16,0.9)'  },
      peripheral:    { label: 'Peripherals',   color: '#ffcc00', bg: 'rgba(36,24,0,0.9)'  },
    },
    statusColors: { active: '#ff0080', online: '#bf5fff', idle: '#ff6b35', offline: '#3a1050' },
    gridColor: 'rgba(255,0,128,0.04)',
  },

  arctic: {
    label: 'Arctic', emoji: '❄️', desc: 'Crystal ice on pale white',
    primary: '#0ea5e9',
    light: true,
    cssVars: {
      '--bg-void': '#f0f7ff', '--bg-dark': '#e8f2ff', '--bg-panel': '#f5f9ff',
      '--bg-card': 'rgba(255,255,255,0.95)', '--bg-surface': 'rgba(248,252,255,0.98)',
      '--border-dim': 'rgba(14,165,233,0.12)', '--border-soft': 'rgba(14,165,233,0.25)', '--border-accent': 'rgba(14,165,233,0.6)',
      '--text-bright': '#0c2040', '--text-primary': '#3a6890', '--text-dim': '#90b8d0',
      '--neon-primary': '#0ea5e9',
    },
    categories: {
      network:       { label: 'Network',       color: '#0ea5e9', bg: 'rgba(224,242,255,0.9)'  },
      computer:      { label: 'Computers',     color: '#0284c7', bg: 'rgba(215,238,255,0.9)'  },
      mobile:        { label: 'Mobile',        color: '#7c3aed', bg: 'rgba(237,233,255,0.9)'  },
      entertainment: { label: 'Entertainment', color: '#dc2626', bg: 'rgba(255,228,228,0.9)'  },
      'smart-home':  { label: 'Smart Home',    color: '#059669', bg: 'rgba(220,252,240,0.9)'  },
      peripheral:    { label: 'Peripherals',   color: '#d97706', bg: 'rgba(255,243,220,0.9)'  },
    },
    statusColors: { active: '#059669', online: '#0ea5e9', idle: '#d97706', offline: '#94a3b8' },
    gridColor: 'rgba(14,165,233,0.1)',
  },

  crimson: {
    label: 'Red Alert', emoji: '🔴', desc: 'Security red on void dark',
    primary: '#ef4444',
    cssVars: {
      '--bg-void': '#0a0000', '--bg-dark': '#100002', '--bg-panel': '#160004',
      '--bg-card': 'rgba(16,0,2,0.97)', '--bg-surface': 'rgba(20,0,4,0.97)',
      '--border-dim': 'rgba(239,68,68,0.08)', '--border-soft': 'rgba(239,68,68,0.16)', '--border-accent': 'rgba(239,68,68,0.45)',
      '--text-bright': '#ffe8e8', '--text-primary': '#c87880', '--text-dim': '#5a2028',
      '--neon-primary': '#ef4444',
    },
    categories: {
      network:       { label: 'Network',       color: '#ef4444', bg: 'rgba(44,0,0,0.9)'   },
      computer:      { label: 'Computers',     color: '#f97316', bg: 'rgba(42,8,0,0.9)'   },
      mobile:        { label: 'Mobile',        color: '#dc2626', bg: 'rgba(38,0,0,0.9)'   },
      entertainment: { label: 'Entertainment', color: '#b91c1c', bg: 'rgba(32,0,0,0.9)'   },
      'smart-home':  { label: 'Smart Home',    color: '#fca5a5', bg: 'rgba(50,4,4,0.9)'   },
      peripheral:    { label: 'Peripherals',   color: '#fb923c', bg: 'rgba(44,10,0,0.9)'  },
    },
    statusColors: { active: '#ef4444', online: '#f97316', idle: '#fca5a5', offline: '#3a0808' },
    gridColor: 'rgba(239,68,68,0.04)',
  },

  forest: {
    label: 'Forest', emoji: '🌲', desc: 'Emerald deep in dark woodland',
    primary: '#22c55e',
    cssVars: {
      '--bg-void': '#000d04', '--bg-dark': '#001208', '--bg-panel': '#001810',
      '--bg-card': 'rgba(0,14,6,0.97)', '--bg-surface': 'rgba(0,18,8,0.97)',
      '--border-dim': 'rgba(34,197,94,0.07)', '--border-soft': 'rgba(34,197,94,0.14)', '--border-accent': 'rgba(34,197,94,0.4)',
      '--text-bright': '#e0ffe8', '--text-primary': '#6ab880', '--text-dim': '#1e4a28',
      '--neon-primary': '#22c55e',
    },
    categories: {
      network:       { label: 'Network',       color: '#22c55e', bg: 'rgba(0,30,12,0.9)'  },
      computer:      { label: 'Computers',     color: '#16a34a', bg: 'rgba(0,24,8,0.9)'   },
      mobile:        { label: 'Mobile',        color: '#84cc16', bg: 'rgba(12,24,0,0.9)'  },
      entertainment: { label: 'Entertainment', color: '#a3e635', bg: 'rgba(16,28,0,0.9)'  },
      'smart-home':  { label: 'Smart Home',    color: '#4ade80', bg: 'rgba(0,32,12,0.9)'  },
      peripheral:    { label: 'Peripherals',   color: '#bef264', bg: 'rgba(18,30,0,0.9)'  },
    },
    statusColors: { active: '#22c55e', online: '#4ade80', idle: '#a3e635', offline: '#1e3a20' },
    gridColor: 'rgba(34,197,94,0.04)',
  },

  'midnight-gold': {
    label: 'Midnight Gold', emoji: '✨', desc: 'Rich gold on warm black',
    primary: '#ffd700',
    cssVars: {
      '--bg-void': '#060400', '--bg-dark': '#0c0800', '--bg-panel': '#100c00',
      '--bg-card': 'rgba(12,8,0,0.97)', '--bg-surface': 'rgba(16,10,0,0.97)',
      '--border-dim': 'rgba(255,215,0,0.07)', '--border-soft': 'rgba(255,215,0,0.14)', '--border-accent': 'rgba(255,215,0,0.4)',
      '--text-bright': '#fff8e0', '--text-primary': '#c8a840', '--text-dim': '#5a4010',
      '--neon-primary': '#ffd700',
    },
    categories: {
      network:       { label: 'Network',       color: '#ffd700', bg: 'rgba(38,28,0,0.9)'  },
      computer:      { label: 'Computers',     color: '#f59e0b', bg: 'rgba(34,22,0,0.9)'  },
      mobile:        { label: 'Mobile',        color: '#d97706', bg: 'rgba(30,16,0,0.9)'  },
      entertainment: { label: 'Entertainment', color: '#b45309', bg: 'rgba(26,12,0,0.9)'  },
      'smart-home':  { label: 'Smart Home',    color: '#fbbf24', bg: 'rgba(36,24,0,0.9)'  },
      peripheral:    { label: 'Peripherals',   color: '#fde68a', bg: 'rgba(40,30,0,0.9)'  },
    },
    statusColors: { active: '#ffd700', online: '#f59e0b', idle: '#fbbf24', offline: '#3a2c00' },
    gridColor: 'rgba(255,215,0,0.04)',
  },
};

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
