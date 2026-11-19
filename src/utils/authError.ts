export type AuthErrorContext = 'google' | 'login' | 'signup' | 'reset' | 'verify';

/**
 * Pure helper to map Firebase Auth errors into clear, actionable Brazilian Portuguese messages.
 */
export function formatFirebaseAuthError(
  err: unknown,
  currentHostname?: string,
  context: AuthErrorContext = 'google',
): string {
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

  if (combined.includes('auth/operation-not-allowed')) {
    return 'O login por e-mail e senha ainda não foi ativado no Firebase Authentication deste projeto. Ative o provedor "E-mail/senha" em Authentication → Sign-in method no Firebase Console.';
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

  if (
    combined.includes('auth/invalid-credential') ||
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/user-not-found') ||
    combined.includes('auth/invalid-login-credentials')
  ) {
    return 'E-mail ou senha incorretos. Confira seus dados ou use "Esqueci minha senha".';
  }

  if (combined.includes('auth/email-already-in-use')) {
    return 'Já existe uma conta vinculada a este e-mail. Tente entrar com sua senha, recuperar a senha ou continuar com Google.';
  }

  if (combined.includes('auth/invalid-email')) {
    return 'Digite um endereço de e-mail válido.';
  }

  if (combined.includes('auth/weak-password')) {
    return 'Escolha uma senha mais forte (mínimo de 8 caracteres com letras e números).';
  }

  if (combined.includes('auth/too-many-requests')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
  }

  if (combined.includes('auth/user-disabled')) {
    return 'Esta conta está temporariamente desativada. Entre em contato com o suporte do ResenhaPOA.';
  }

  if (combined.includes('auth/network-request-failed')) {
    return context === 'google'
      ? 'Não foi possível conectar ao Google agora. Verifique sua conexão e tente novamente.'
      : 'Sem conexão no momento. Verifique sua internet e tente novamente.';
  }

  if (combined.includes('auth/account-exists-with-different-credential')) {
    return 'Já existe uma conta cadastrada com este e-mail usando outro método de login.';
  }

  if (context === 'signup') {
    return 'Não foi possível criar sua conta agora. Tente novamente em instantes.';
  }
  if (context === 'login') {
    return 'Não foi possível entrar agora. Confira seus dados e tente novamente.';
  }
  if (context === 'reset') {
    return 'Não foi possível enviar o e-mail de recuperação agora. Tente novamente em instantes.';
  }
  if (context === 'verify') {
    return 'Não foi possível reenviar o e-mail de confirmação agora. Aguarde um instante e tente novamente.';
  }

  return 'Não foi possível entrar com o Google agora. Tente novamente em instantes.';
}
