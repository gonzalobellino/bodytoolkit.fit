/**
 * Feature flags and env for premium/payments.
 * Payments off by default until a payment processor is integrated.
 */
export const PREMIUM_PAYMENTS_ENABLED =
  import.meta.env.VITE_PREMIUM_PAYMENTS_ENABLED === 'true';

/** Show "TPI Level 1" certification badge on About page. Default: true. */
export const SHOW_TPI_LEVEL1_BADGE =
  import.meta.env.VITE_SHOW_TPI_LEVEL1_BADGE !== 'false';

/** Show "TPI Fitness Level 2" certification badge on About page. Default: true. */
export const SHOW_TPI_LEVEL2_BADGE =
  import.meta.env.VITE_SHOW_TPI_LEVEL2_BADGE !== 'false';

/** Contact email for mailto links (footer, etc.). Set VITE_CONTACT_EMAIL in deployment. */
export const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() ||
  'coach@example.com';
