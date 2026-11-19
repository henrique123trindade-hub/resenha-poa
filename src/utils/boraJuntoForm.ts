export const BORA_JUNTO_LIMITS = {
  PARTICIPANT_NAME_MIN: 2,
  PARTICIPANT_NAME_MAX: 40,
  POLL_TITLE_MIN: 3,
  POLL_TITLE_MAX: 80,
  POLL_DESC_MAX: 160,
} as const;

export interface FieldValidationResult {
  valid: boolean;
  normalized: string;
  error: string | null;
}

function normalizeSpacing(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function validateParticipantName(raw: string): FieldValidationResult {
  const normalized = normalizeSpacing(raw);
  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      error: 'Digite como a galera pode te chamar antes de votar.',
    };
  }
  if (normalized.length < BORA_JUNTO_LIMITS.PARTICIPANT_NAME_MIN) {
    return {
      valid: false,
      normalized,
      error: `Use pelo menos ${BORA_JUNTO_LIMITS.PARTICIPANT_NAME_MIN} caracteres para seu nome.`,
    };
  }
  if (normalized.length > BORA_JUNTO_LIMITS.PARTICIPANT_NAME_MAX) {
    return {
      valid: false,
      normalized: normalized.slice(0, BORA_JUNTO_LIMITS.PARTICIPANT_NAME_MAX),
      error: `Use no máximo ${BORA_JUNTO_LIMITS.PARTICIPANT_NAME_MAX} caracteres.`,
    };
  }
  return { valid: true, normalized, error: null };
}

export function validatePollTitle(raw: string): FieldValidationResult {
  const normalized = normalizeSpacing(raw);
  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      error: 'Dê um nome para a resenha antes de criar a votação.',
    };
  }
  if (normalized.length < BORA_JUNTO_LIMITS.POLL_TITLE_MIN) {
    return {
      valid: false,
      normalized,
      error: `O nome da resenha precisa ter pelo menos ${BORA_JUNTO_LIMITS.POLL_TITLE_MIN} caracteres.`,
    };
  }
  if (normalized.length > BORA_JUNTO_LIMITS.POLL_TITLE_MAX) {
    return {
      valid: false,
      normalized: normalized.slice(0, BORA_JUNTO_LIMITS.POLL_TITLE_MAX),
      error: `Use no máximo ${BORA_JUNTO_LIMITS.POLL_TITLE_MAX} caracteres.`,
    };
  }
  return { valid: true, normalized, error: null };
}
