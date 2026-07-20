// ============================================================
// Variantes de Framer Motion — Al Tokepay
// Focalizadas en transacciones financieras y dashboards
// ============================================================

import type { Variants, Transition } from 'framer-motion'

// ── Springs personalizados ─────────────────────────────────

export const springSnap: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 0.8,
}

export const springSmooth: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 1,
}

export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 25,
  mass: 0.5,
}

// ── Entrada de páginas ─────────────────────────────────────

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// ── Cards / Panels ─────────────────────────────────────────

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
}

// ── Stagger para listas (amortización, cuotas) ─────────────

export const listContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
}

export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -12 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
}

// ── Transición de pago exitoso (fila de tabla) ─────────────

export const paymentSuccessRowVariants: Variants = {
  idle: {
    backgroundColor: 'rgba(30, 41, 59, 0)',
    scale: 1,
  },
  success: {
    backgroundColor: ['rgba(5, 150, 105, 0.3)', 'rgba(5, 150, 105, 0.1)', 'rgba(30, 41, 59, 0)'],
    scale: [1, 1.01, 1],
    transition: {
      duration: 1.2,
      times: [0, 0.3, 1],
      ease: 'easeOut',
    },
  },
}

// ── Modal / Dialogs ────────────────────────────────────────

export const modalOverlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const modalContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 16 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSnap,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
}

// ── Bottom Sheet (móvil) ───────────────────────────────────

export const bottomSheetVariants: Variants = {
  initial: { y: '100%', opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: springSmooth,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.25, ease: [0.36, 0, 0.66, 0] },
  },
}

// ── Sidebar ────────────────────────────────────────────────

export const sidebarVariants: Variants = {
  expanded: {
    width: 256,
    transition: springSnap,
  },
  collapsed: {
    width: 68,
    transition: springSnap,
  },
}

export const sidebarLabelVariants: Variants = {
  expanded: {
    opacity: 1,
    x: 0,
    display: 'block',
    transition: { delay: 0.1, duration: 0.2 },
  },
  collapsed: {
    opacity: 0,
    x: -8,
    transitionEnd: { display: 'none' },
    transition: { duration: 0.15 },
  },
}

// ── KPI Números animados ───────────────────────────────────

export const kpiVariants: Variants = {
  initial: { opacity: 0, scale: 0.85 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springBouncy,
  },
}

// ── Notificaciones / Toasts ────────────────────────────────

export const toastVariants: Variants = {
  initial: { opacity: 0, x: 60, scale: 0.9 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: springSnap,
  },
  exit: {
    opacity: 0,
    x: 60,
    scale: 0.9,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}
