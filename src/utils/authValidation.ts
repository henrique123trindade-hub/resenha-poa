export const AUTH_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 80,
  EMAIL_MAX: 200,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
} as const;

export interface FieldValidationResult {
  valid: boolean;
  normalized: string;
  error: string | null;
}

export interface PasswordPolicyChecks {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  withinMax: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  checks: PasswordPolicyChecks;
  error: string | null;
}

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeDisplayName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function validateDisplayName(raw: string): FieldValidationResult {
  const normalized = normalizeDisplayName(raw);
  if (!normalized) {
    return { valid: false, normalized, error: 'Digite seu nome para continuar.' };
  }
  if (normalized.length < AUTH_LIMITS.NAME_MIN) {
    return {
      valid: false,
      normalized,
      error: `Use pelo menos ${AUTH_LIMITS.NAME_MIN} caracteres no nome.`,
    };
  }
  if (normalized.length > AUTH_LIMITS.NAME_MAX) {
    return {
      valid: false,
      normalized: normalized.slice(0, AUTH_LIMITS.NAME_MAX),
      error: `Use no máximo ${AUTH_LIMITS.NAME_MAX} caracteres.`,
    };
  }
  return { valid: true, normalized, error: null };
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmail(raw: string): FieldValidationResult {
  const normalized = normalizeEmail(raw);
  if (!normalized) {
    return { valid: false, normalized, error: 'Digite seu e-mail.' };
  }
  if (normalized.length > AUTH_LIMITS.EMAIL_MAX || !SIMPLE_EMAIL_REGEX.test(normalized)) {
    return { valid: false, normalized, error: 'Digite um e-mail válido (ex.: nome@email.com).' };
  }
  return { valid: true, normalized, error: null };
}

export function evaluatePasswordPolicy(password: string): PasswordPolicyChecks {
  return {
    minLength: password.length >= AUTH_LIMITS.PASSWORD_MIN,
    hasLetter: /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(password),
    hasNumber: /\d/.test(password),
    withinMax: password.length <= AUTH_LIMITS.PASSWORD_MAX,
  };
}

export function validatePasswordForSignup(password: string): PasswordValidationResult {
  const checks = evaluatePasswordPolicy(password);
  if (!password) {
    return { valid: false, checks, error: 'Crie uma senha para sua conta.' };
  }
  if (!checks.minLength) {
    return {
      valid: false,
      checks,
      error: `A senha precisa ter pelo menos ${AUTH_LIMITS.PASSWORD_MIN} caracteres.`,
    };
  }
  if (!checks.withinMax) {
    return {
      valid: false,
      checks,
      error: `A senha pode ter no máximo ${AUTH_LIMITS.PASSWORD_MAX} caracteres.`,
    };
  }
  if (!checks.hasLetter || !checks.hasNumber) {
    return {
      valid: false,
      checks,
      error: 'Inclua pelo menos uma letra e um número na senha.',
    };
  }
  return { valid: true, checks, error: null };
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): { valid: boolean; error: string | null } {
  if (!confirmation) {
    return { valid: false, error: 'Confirme sua senha.' };
  }
  if (password !== confirmation) {
    return { valid: false, error: 'As senhas não conferem.' };
  }
  return { valid: true, error: null };
}

export function validateLoginPassword(password: string): { valid: boolean; error: string | null } {
  if (!password) {
    return { valid: false, error: 'Digite sua senha.' };
  }
  if (password.length > AUTH_LIMITS.PASSWORD_MAX) {
    return { valid: false, error: 'Senha inválida.' };
  }
  return { valid: true, error: null };
}

export function getDisplayInitials(name?: string | null, email?: string | null): string {
  const cleanName = normalizeDisplayName(name || '');
  if (cleanName) {
    const parts = cleanName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
  }
  const cleanEmail = (email || '').trim();
  if (cleanEmail) {
    return cleanEmail.slice(0, 2).toUpperCase();
  }
  return 'RP';
}

/**
 * Resolves the initial suggested name for a Bora Junto participant.
 * Priority:
 * 1. Existing vote label in this specific group (never overwrite a group name already chosen)
 * 2. Signed-in user's ResenhaPOA profile name / Auth displayName
 * 3. Previously saved guest name (for unauthenticated visitors)
 */
export function resolveBoraJuntoInitialName(params: {
  existingVoteLabel?: string | null;
  profileName?: string | null;
  userDisplayName?: string | null;
  savedGuestName?: string | null;
  isSignedIn: boolean;
  maxLength?: number;
}): string {
  const maxLen = params.maxLength ?? 40;
  const existing = (params.existingVoteLabel || '').trim();
  if (existing) {
    return existing.slice(0, maxLen);
  }
  if (params.isSignedIn) {
    const accountName = (params.profileName || params.userDisplayName || '').trim();
    if (accountName) {
      return accountName.slice(0, maxLen);
    }
  }
  const guest = (params.savedGuestName || '').trim();
  return guest.slice(0, maxLen);
}
