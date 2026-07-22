import { Theme } from '../i18n/translations';

export interface ThemeEdgeColors {
  activeColor: string;
  defaultColor: string;
}

/**
 * Returns theme-compatible edge default & highlight colors based on current app theme.
 */
export function getThemeEdgeColors(theme: Theme | string): ThemeEdgeColors {
  switch (theme) {
    case 'retro':
      return {
        activeColor: '#ffb703', // Warm Retro Amber Gold
        defaultColor: '#d97706', // Retro Ochre
      };
    case 'synthwave':
      return {
        activeColor: '#00f0ff', // Neon Cyan
        defaultColor: '#a855f7', // Neon Purple
      };
    case 'dracula':
      return {
        activeColor: '#bd93f9', // Dracula Purple
        defaultColor: '#6272a4', // Dracula Muted Slate
      };
    case 'nord':
      return {
        activeColor: '#88c0d0', // Nord Frost Cyan
        defaultColor: '#81a1c1', // Nord Blue
      };
    case 'dark':
      return {
        activeColor: '#6366f1', // Indigo
        defaultColor: '#64748b', // Slate 500
      };
    case 'light':
    default:
      return {
        activeColor: '#6366f1', // Indigo
        defaultColor: '#94a3b8', // Slate 400
      };
  }
}
