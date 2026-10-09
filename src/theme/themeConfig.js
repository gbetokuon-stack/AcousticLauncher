export const THEMES = {
  tohru: {
    id: 'tohru',
    name: 'Tohru Dragon Flame 🔥',
    desc: 'Lửa rồng Tohru, nơ đỏ hầu gái & vàng kim rực rỡ',
    primaryColor: '#ff5722',
    previewGradient: 'from-amber-400 via-orange-500 to-rose-600',
    cssVars: {
      '--color-bg0': '#120707',
      '--color-bg1': 'rgba(28, 11, 11, 0.45)',
      '--color-bg2': 'rgba(42, 16, 16, 0.55)',
      '--color-bg3': 'rgba(60, 22, 22, 0.65)',
      '--color-line': 'rgba(255, 87, 34, 0.12)',
      '--color-linestrong': 'rgba(255, 87, 34, 0.24)',
      '--color-fg': '#fff7ed',
      '--color-fgdim': '#fed7aa',
      '--color-fgfaint': '#fb923c',
      '--color-accent': '#ff5722',
      '--color-accentstrong': '#f43f5e',
      '--color-accentsoft': 'rgba(255, 87, 34, 0.14)',
      '--color-accentfg': '#120707',
      '--theme-glow': 'rgba(255, 87, 34, 0.45)',
    },
  },
  kanna: {
    id: 'kanna',
    name: 'Kanna Kamui ⚡',
    desc: 'Hồng phấn pastel & Tím saiyan điện quang dễ thương',
    primaryColor: '#f472b6',
    previewGradient: 'from-pink-300 via-rose-400 to-indigo-400',
    cssVars: {
      '--color-bg0': '#110714',
      '--color-bg1': 'rgba(26, 11, 32, 0.45)',
      '--color-bg2': 'rgba(38, 16, 46, 0.55)',
      '--color-bg3': 'rgba(54, 22, 66, 0.65)',
      '--color-line': 'rgba(244, 114, 182, 0.12)',
      '--color-linestrong': 'rgba(244, 114, 182, 0.25)',
      '--color-fg': '#fdf2f8',
      '--color-fgdim': '#fbcfe8',
      '--color-fgfaint': '#f472b6',
      '--color-accent': '#f472b6',
      '--color-accentstrong': '#c084fc',
      '--color-accentsoft': 'rgba(244, 114, 182, 0.14)',
      '--color-accentfg': '#110714',
      '--theme-glow': 'rgba(244, 114, 182, 0.45)',
    },
  },
  elma: {
    id: 'elma',
    name: 'Elma Sea Dragon 🍡',
    desc: 'Xanh lam thủy tộc & màu bánh ngọt truyền thống',
    primaryColor: '#06b6d4',
    previewGradient: 'from-cyan-300 via-teal-400 to-blue-500',
    cssVars: {
      '--color-bg0': '#041018',
      '--color-bg1': 'rgba(7, 24, 38, 0.45)',
      '--color-bg2': 'rgba(11, 36, 58, 0.55)',
      '--color-bg3': 'rgba(16, 52, 82, 0.65)',
      '--color-line': 'rgba(6, 182, 212, 0.12)',
      '--color-linestrong': 'rgba(6, 182, 212, 0.24)',
      '--color-fg': '#ecfeff',
      '--color-fgdim': '#a5f3fc',
      '--color-fgfaint': '#67e8f9',
      '--color-accent': '#06b6d4',
      '--color-accentstrong': '#0284c7',
      '--color-accentsoft': 'rgba(6, 182, 212, 0.14)',
      '--color-accentfg': '#041018',
      '--theme-glow': 'rgba(6, 182, 212, 0.45)',
    },
  },
  lucoa: {
    id: 'lucoa',
    name: 'Lucoa Quetzalcoatl 🍃',
    desc: 'Xanh ngọc lục bảo thần thoại & vàng mạ rực rỡ',
    primaryColor: '#10b981',
    previewGradient: 'from-emerald-300 via-teal-400 to-amber-400',
    cssVars: {
      '--color-bg0': '#05120a',
      '--color-bg1': 'rgba(8, 28, 16, 0.45)',
      '--color-bg2': 'rgba(12, 42, 24, 0.55)',
      '--color-bg3': 'rgba(18, 60, 34, 0.65)',
      '--color-line': 'rgba(16, 185, 129, 0.12)',
      '--color-linestrong': 'rgba(16, 185, 129, 0.24)',
      '--color-fg': '#ecfdf5',
      '--color-fgdim': '#a7f3d0',
      '--color-fgfaint': '#6ee7b7',
      '--color-accent': '#10b981',
      '--color-accentstrong': '#059669',
      '--color-accentsoft': 'rgba(16, 185, 129, 0.14)',
      '--color-accentfg': '#05120a',
      '--theme-glow': 'rgba(16, 185, 129, 0.45)',
    },
  },
  kobayashi: {
    id: 'kobayashi',
    name: 'Kobayashi-san 👓',
    desc: 'Hổ phách cà phê chiều & không khí ấm cúng gia đình',
    primaryColor: '#f59e0b',
    previewGradient: 'from-amber-300 via-orange-400 to-rose-500',
    cssVars: {
      '--color-bg0': '#130c05',
      '--color-bg1': 'rgba(30, 18, 8, 0.45)',
      '--color-bg2': 'rgba(46, 28, 12, 0.55)',
      '--color-bg3': 'rgba(64, 38, 16, 0.65)',
      '--color-line': 'rgba(245, 158, 11, 0.12)',
      '--color-linestrong': 'rgba(245, 158, 11, 0.24)',
      '--color-fg': '#fffbeb',
      '--color-fgdim': '#fde68a',
      '--color-fgfaint': '#f59e0b',
      '--color-accent': '#f59e0b',
      '--color-accentstrong': '#ea580c',
      '--color-accentsoft': 'rgba(245, 158, 11, 0.14)',
      '--color-accentfg': '#130c05',
      '--theme-glow': 'rgba(245, 158, 11, 0.45)',
    },
  },
}

// Giữ alias tương thích ngược với các ID cũ
THEMES.rose = THEMES.kanna
THEMES.emerald = THEMES.lucoa
THEMES.amethyst = THEMES.kanna
THEMES.ocean = THEMES.elma
THEMES.solar = THEMES.kobayashi

export function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES.tohru
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.cssVars)) {
    root.style.setProperty(key, value)
  }
}
