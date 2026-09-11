import type { SlideCanvasTheme } from '../../types';

export const getCanvasThemeClasses = (theme?: SlideCanvasTheme): { bg: string; isLight: boolean } => {
  switch (theme) {
    case 'dark':
      return { bg: 'bg-[#0D0F15] text-[#F3F4F6]', isLight: false };
    case 'neo-card':
      return { bg: 'bg-[#151822] text-[#E5E7EB]', isLight: false };
    case 'retro-dots':
      return { bg: 'bg-[#11141E] text-[#F3F4F6] bg-retro-dots', isLight: false };
    case 'neo-cream':
      return { bg: 'bg-[#FFFDF5] text-black', isLight: true };
    case 'neo-yellow':
      return { bg: 'bg-[#FFE600] text-black', isLight: true };
    case 'neo-cyan':
      return { bg: 'bg-[#00F0FF] text-black', isLight: true };
    case 'neo-mint':
      return { bg: 'bg-[#00FF88] text-black', isLight: true };
    case 'neo-pink':
      return { bg: 'bg-[#FF3366] text-black', isLight: true };
    case 'retro-grid':
    default:
      return { bg: 'bg-[#0D0F15] text-[#F3F4F6] bg-retro-grid', isLight: false };
  }
};

export const CANVAS_THEMES: { id: SlideCanvasTheme; label: string; bgClass: string; textClass: string; borderClass: string }[] = [
  { id: 'retro-grid', label: 'Retro Grid', bgClass: 'bg-[#0D0F15]', textClass: 'text-[#F3F4F6]', borderClass: 'border-slate-700' },
  { id: 'dark', label: 'Cyber Dark', bgClass: 'bg-[#0D0F15]', textClass: 'text-[#F3F4F6]', borderClass: 'border-slate-800' },
  { id: 'neo-card', label: 'Neo Card', bgClass: 'bg-[#151822]', textClass: 'text-[#E5E7EB]', borderClass: 'border-black' },
  { id: 'retro-dots', label: 'Retro Dots', bgClass: 'bg-[#11141E]', textClass: 'text-[#F3F4F6]', borderClass: 'border-slate-700' },
  { id: 'neo-cream', label: 'Neo Cream', bgClass: 'bg-[#FFFDF5]', textClass: 'text-black', borderClass: 'border-black' },
  { id: 'neo-yellow', label: 'Neo Yellow', bgClass: 'bg-[#FFE600]', textClass: 'text-black', borderClass: 'border-black' },
  { id: 'neo-cyan', label: 'Neo Cyan', bgClass: 'bg-[#00F0FF]', textClass: 'text-black', borderClass: 'border-black' },
  { id: 'neo-mint', label: 'Neo Mint', bgClass: 'bg-[#00FF88]', textClass: 'text-black', borderClass: 'border-black' },
  { id: 'neo-pink', label: 'Neo Pink', bgClass: 'bg-[#FF3366]', textClass: 'text-black', borderClass: 'border-black' },
];
