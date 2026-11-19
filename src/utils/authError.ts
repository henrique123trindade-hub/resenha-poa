/**
 * Pure helper to map Firebase Auth errors into clear, actionable Brazilian Portuguese messages.
 */
export function formatFirebaseAuthError(err: unknown, currentHostname?: string): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  const rawMessage = err instanceof Error ? err.message : String(err ?? '');
  const combined = `${code} ${rawMessage}`.toLowerCase();

  if (combined.includes('auth/unauthorized-domain')) {
    const host = (currentHostname || '').trim();
    if (host) {
      return `O domínio "${host}" ainda não está autorizado no Firebase Authentication. Adicione este endereço em Authentication → Settings → Authorized domains no Firebase Console e recarregue a página.`;
    }
    return 'Este domínio ainda não está autorizado no Firebase Authentication. Adicione o endereço atual em Authentication → Settings → Authorized domains no Firebase Console.';
  }

  if (combined.includes('auth/popup-blocked')) {
    return 'O navegador bloqueou a janela de login do Google. Libere pop-ups para este site e tente novamente.';
  }

  if (
    combined.includes('auth/popup-closed-by-user') ||
    combined.includes('auth/cancelled-popup-request')
  ) {
    return 'A janela de login foi fechada antes de concluir. Clique em "Continuar com Google" para tentar novamente.';
  }

  if (combined.includes('auth/network-request-failed')) {
    return 'Não foi possível conectar ao Google agora. Verifique sua conexão e tente novamente.';
  }

  if (combined.includes('auth/account-exists-with-different-credential')) {
    return 'Já existe uma conta cadastrada com este e-mail usando outro método de login.';
  }

  return 'Não foi possível entrar com o Google agora. Tente novamente em instantes.';
}
