import { Variants } from 'framer-motion';

/**
 * Orderly Motion Variants
 * Reusable animation variants for consistent, premium animations across the app.
 */

// Fade up - Most common, used for sections and cards
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// Fade in - Subtle appearance
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4 },
  },
};

// Fade down - For dropdowns, menus
export const fadeDownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// Scale up - For modals, popovers
export const scaleUpVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// Slide in from left - For sidebars, drawers
export const slideInLeftVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    x: -20,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Slide in from right
export const slideInRightVariants: Variants = {
  hidden: { x: 20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    x: 20,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Stagger container - Wrap children that should animate sequentially
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Stagger item - Children of stagger container
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// Fast stagger - For lists, grids with many items
export const fastStaggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

// Blur fade - Premium reveal effect
export const blurFadeVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: 'blur(10px)',
    y: 10,
  },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// Page transition variants
export const pageTransitionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
};

// Card hover animations (use with whileHover)
export const cardHoverVariants = {
  lift: { y: -4, transition: { duration: 0.2 } },
  scale: { scale: 1.02, transition: { duration: 0.2 } },
  glow: { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)', transition: { duration: 0.2 } },
};

// Button tap animation (use with whileTap)
export const buttonTapVariants = {
  tap: { scale: 0.98 },
};

// Common transition presets
export const transitions = {
  // Smooth easeOut (default for most animations)
  smooth: { duration: 0.3, ease: 'easeOut' },
  // Snappy for micro-interactions
  snappy: { duration: 0.15, ease: 'easeInOut' },
  // Spring for natural feel
  spring: { type: 'spring', stiffness: 300, damping: 20 },
  // Slow for dramatic reveals
  slow: { duration: 0.6, ease: 'easeOut' },
} as const;

// Viewport settings for scroll-triggered animations
export const viewportSettings = {
  // Default - trigger once when 100px from entering viewport
  default: { once: true, margin: '-100px' },
  // Immediate - trigger as soon as visible
  immediate: { once: true, margin: '0px' },
  // Delayed - trigger when more of element is visible
  delayed: { once: true, margin: '-200px' },
} as const;

