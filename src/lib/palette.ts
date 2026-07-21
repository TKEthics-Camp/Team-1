/** 莫兰迪色系 —— 低饱和、柔和、安静的高级灰调。 */
export interface OrbColor {
  key: string
  label: string
  from: string
  to: string
  glow: string // rgba glow tint
}

export const PALETTE: OrbColor[] = [
  { key: 'rose', label: '烟粉', from: '#E4C6BF', to: '#D0A79F', glow: 'rgba(208,167,159,0.45)' },
  { key: 'sage', label: '灰豆绿', from: '#BCC8B2', to: '#9DB09A', glow: 'rgba(157,176,154,0.45)' },
  { key: 'haze', label: '雾霾蓝', from: '#B3C2CE', to: '#8FA5B5', glow: 'rgba(143,165,181,0.45)' },
  { key: 'oat', label: '燕麦', from: '#E7D7BD', to: '#D6BD9C', glow: 'rgba(214,189,156,0.45)' },
  { key: 'mauve', label: '灰紫', from: '#C6BACA', to: '#A89BB2', glow: 'rgba(168,155,178,0.45)' },
  { key: 'milktea', label: '奶茶', from: '#DEC9B6', to: '#C9AE97', glow: 'rgba(201,174,151,0.45)' },
  { key: 'olive', label: '青橄榄', from: '#C3C5AC', to: '#A6A88E', glow: 'rgba(166,168,142,0.45)' },
  { key: 'slate', label: '石灰蓝', from: '#ADB9C4', to: '#8B99A9', glow: 'rgba(139,153,169,0.45)' },
  { key: 'bean', label: '豆沙', from: '#D4B2AA', to: '#BB958D', glow: 'rgba(187,149,141,0.45)' },
  { key: 'stone', label: '暖石灰', from: '#CCCCC0', to: '#AEAEA0', glow: 'rgba(174,174,160,0.45)' },
]

export const getColor = (key: string): OrbColor =>
  PALETTE.find((c) => c.key === key) ?? PALETTE[0]

export const gradientOf = (key: string) => {
  const c = getColor(key)
  return `linear-gradient(135deg, ${c.from}, ${c.to})`
}

/** 同一色系的低透明度版本，用于页面头部晕染。 */
export const softGlowOf = (key: string) =>
  getColor(key).glow.replace(/, [\d.]+\)$/, ', 0.18)')
