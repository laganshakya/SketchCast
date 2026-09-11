import type {
  SlideTransitionType,
  ElementAnimationType,
  AnimationPresetBundle,
} from '../../types';

export interface AnimationBundleConfig {
  id: AnimationPresetBundle;
  label: string;
  badge: string;
  description: string;
  transition: SlideTransitionType;
  elementAnimation: ElementAnimationType;
  duration: number; // in seconds
  delay: number; // stagger in seconds
  colorClass: string;
}

export const ANIMATION_BUNDLES: AnimationBundleConfig[] = [
  {
    id: 'neo-arcade',
    label: 'Neo Arcade Pop',
    badge: '★ RETRO ARCADE',
    description: 'Springy pop-in entrance with punchy arcade sound-feel and dynamic motion',
    transition: 'arcade-pop',
    elementAnimation: 'pop-in',
    duration: 0.45,
    delay: 0.08,
    colorClass: 'bg-neo-yellow text-black border-black',
  },
  {
    id: 'cyber-glitch',
    label: 'Cyber Glitch & Slide',
    badge: '⚡ CYBERPUNK',
    description: 'High-tech horizontal slide entrance with crisp stagger reveals',
    transition: 'cyber-glitch',
    elementAnimation: 'slide-up',
    duration: 0.35,
    delay: 0.05,
    colorClass: 'bg-neo-pink text-white border-black',
  },
  {
    id: 'smooth-executive',
    label: 'Smooth Executive',
    badge: '✦ SILKY PRO',
    description: 'Soft cinematic fade transition with staggered elegance for formal presentations',
    transition: 'fade',
    elementAnimation: 'fade-in',
    duration: 0.6,
    delay: 0.1,
    colorClass: 'bg-neo-cyan text-black border-black',
  },
  {
    id: 'bouncy-retro',
    label: 'Bouncy Retro',
    badge: '✦ ENERGETIC',
    description: 'Playful bouncy scale entrance that injects fun into live interactive decks',
    transition: 'bounce',
    elementAnimation: 'bounce',
    duration: 0.5,
    delay: 0.1,
    colorClass: 'bg-neo-mint text-black border-black',
  },
  {
    id: 'clean-minimal',
    label: 'Clean Minimal',
    badge: '⚡ ZERO-LAG',
    description: 'Instant switching with no delay, perfect for high-speed code demos',
    transition: 'none',
    elementAnimation: 'none',
    duration: 0.1,
    delay: 0,
    colorClass: 'bg-[#222736] text-white border-slate-700',
  },
];

export const TRANSITION_OPTIONS: { id: SlideTransitionType; label: string; desc: string }[] = [
  { id: 'arcade-pop', label: 'Neo Arcade Pop', desc: 'Springy pop with subtle rotation' },
  { id: 'cyber-glitch', label: 'Cyber Glitch', desc: 'Fast slide with hue filter' },
  { id: 'fade', label: 'Smooth Fade', desc: 'Cinematic opacity cross-dissolve' },
  { id: 'slide-horizontal', label: 'Slide Horizontal', desc: 'Dynamic left-to-right push' },
  { id: 'slide-vertical', label: 'Slide Vertical', desc: 'Upward stage elevation' },
  { id: 'zoom', label: 'Scale Zoom', desc: 'Immersive focus scaling' },
  { id: 'flip', label: '3D Flip', desc: 'Perspective card flip' },
  { id: 'bounce', label: 'Retro Bounce', desc: 'Elastic bouncy drop' },
  { id: 'none', label: 'Instant / None', desc: 'Immediate switch without animation' },
];

export const ELEMENT_ANIMATION_OPTIONS: { id: ElementAnimationType; label: string; desc: string }[] = [
  { id: 'pop-in', label: 'Spring Pop-In', desc: 'Punchy scale-up entrance' },
  { id: 'slide-up', label: 'Slide Up', desc: 'Clean slide upward from bottom' },
  { id: 'slide-down', label: 'Slide Down', desc: 'Smooth drop from top' },
  { id: 'fade-in', label: 'Soft Fade In', desc: 'Gradual opacity reveal' },
  { id: 'zoom-in', label: 'Zoom In', desc: 'Scale from center' },
  { id: 'bounce', label: 'Elastic Bounce', desc: 'Bouncy energetic drop' },
  { id: 'none', label: 'Static / None', desc: 'Appears immediately' },
];

/**
 * Slide Transition Animation Variants for Framer Motion
 */
export const getSlideTransitionVariants = (
  transitionType: SlideTransitionType = 'arcade-pop',
  duration: number = 0.4
) => {
  const dur = Math.max(0.1, duration);

  switch (transitionType) {
    case 'arcade-pop':
      return {
        initial: { scale: 0.75, rotate: -2, opacity: 0 },
        animate: {
          scale: 1,
          rotate: 0,
          opacity: 1,
          transition: { type: 'spring' as const, damping: 15, stiffness: 240, duration: dur },
        },
        exit: { scale: 0.85, opacity: 0, transition: { duration: 0.2 } },
      };

    case 'cyber-glitch':
      return {
        initial: { x: -60, opacity: 0, filter: 'contrast(150%)' },
        animate: {
          x: 0,
          opacity: 1,
          filter: 'contrast(100%)',
          transition: { duration: dur, ease: 'easeOut' as const },
        },
        exit: { x: 60, opacity: 0, transition: { duration: 0.2 } },
      };

    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: dur, ease: 'easeOut' as const } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
      };

    case 'slide-horizontal':
      return {
        initial: { x: 80, opacity: 0 },
        animate: { x: 0, opacity: 1, transition: { duration: dur, ease: 'easeInOut' as const } },
        exit: { x: -80, opacity: 0, transition: { duration: 0.2 } },
      };

    case 'slide-vertical':
      return {
        initial: { y: 60, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { duration: dur, ease: 'easeInOut' as const } },
        exit: { y: -60, opacity: 0, transition: { duration: 0.2 } },
      };

    case 'zoom':
      return {
        initial: { scale: 0.82, opacity: 0 },
        animate: { scale: 1, opacity: 1, transition: { duration: dur, ease: 'easeOut' as const } },
        exit: { scale: 1.08, opacity: 0, transition: { duration: 0.2 } },
      };

    case 'flip':
      return {
        initial: { rotateX: 45, opacity: 0, transformPerspective: 800 },
        animate: { rotateX: 0, opacity: 1, transition: { duration: dur, ease: 'easeOut' as const } },
        exit: { rotateX: -45, opacity: 0, transition: { duration: 0.2 } },
      };

    case 'bounce':
      return {
        initial: { y: -70, opacity: 0 },
        animate: {
          y: 0,
          opacity: 1,
          transition: { type: 'spring' as const, bounce: 0.45, duration: dur },
        },
        exit: { y: 40, opacity: 0, transition: { duration: 0.2 } },
      };

    case 'none':
    default:
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1, transition: { duration: 0.01 } },
        exit: { opacity: 1, transition: { duration: 0.01 } },
      };
  }
};

/**
 * Element Entrance Animation Props for Framer Motion
 */
export const getElementAnimationProps = (
  animType: ElementAnimationType = 'pop-in',
  index: number = 0,
  staggerDelay: number = 0.08,
  duration: number = 0.4
) => {
  const delay = Math.max(0, index * staggerDelay);
  const dur = Math.max(0.1, duration);

  switch (animType) {
    case 'pop-in':
      return {
        initial: { scale: 0.7, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring' as const, damping: 14, stiffness: 220, delay, duration: dur },
      };

    case 'slide-up':
      return {
        initial: { y: 35, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: dur, ease: 'easeOut' as const, delay },
      };

    case 'slide-down':
      return {
        initial: { y: -35, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: dur, ease: 'easeOut' as const, delay },
      };

    case 'fade-in':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: dur, ease: 'easeOut' as const, delay },
      };

    case 'zoom-in':
      return {
        initial: { scale: 0.6, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { duration: dur, ease: 'easeOut' as const, delay },
      };

    case 'bounce':
      return {
        initial: { y: -45, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { type: 'spring' as const, bounce: 0.5, delay, duration: dur },
      };

    case 'none':
    default:
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        transition: { duration: 0.01 },
      };
  }
};
