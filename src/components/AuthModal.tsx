import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  MailCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAuth, type AuthModalMode } from '../contexts/AuthContext';
import { formatFirebaseAuthError } from '../utils/authError';
import {
  AUTH_LIMITS,
  evaluatePasswordPolicy,
  validateDisplayName,
  validateEmail,
  validateLoginPassword,
  validatePasswordConfirmation,
  validatePasswordForSignup,
} from '../utils/authValidation';
import { ResenhaInput } from './FormField';

interface AuthModalProps {
  onNotify: (msg: string) => void;
}

const GoogleMark: React.FC = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12z"
    />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ onNotify }) => {
  const {
    user,
    authModalOpen,
    authModalMode,
    authPromptReason,
    setAuthModalMode,
    closeAuthModal,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    refreshAuthUser,
    logout,
  } = useAuth();

  // Shared / per-mode form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field-level & banner errors / success messages
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Busy flags
  const [busyAction, setBusyAction] = useState<
    null | 'google' | 'login' | 'signup' | 'reset' | 'resend' | 'refresh'
  >(null);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);

  // Reset transient state whenever modal closes
  useEffect(() => {
    if (!authModalOpen) {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setNameError(null);
      setEmailError(null);
      setPasswordError(null);
      setConfirmError(null);
      setBannerError(null);
      setSuccessInfo(null);
      setBusyAction(null);
    }
  }, [authModalOpen]);

  // Clear field errors when switching between login / signup / reset / verify
  const switchMode = (nextMode: AuthModalMode) => {
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);
    setBannerError(null);
    setSuccessInfo(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAuthModalMode(nextMode);
  };

  if (!authModalOpen) return null;

  const isBusy = busyAction !== null;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const policyChecks = evaluatePasswordPolicy(password);

  const handleGoogleSignIn = async () => {
    setBusyAction('google');
    setBannerError(null);
    setSuccessInfo(null);
    try {
      await loginWithGoogle();
      onNotify('Sessão iniciada com sucesso.');
    } catch (err) {
      setBannerError(formatFirebaseAuthError(err, hostname, 'google'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    setSuccessInfo(null);

    const emailCheck = validateEmail(email);
    const passCheck = validateLoginPassword(password);
    setEmailError(emailCheck.error);
    setPasswordError(passCheck.error);

    if (!emailCheck.valid) {
      emailRef.current?.focus();
      return;
    }
    if (!passCheck.valid) {
      passwordRef.current?.focus();
      return;
    }

    setBusyAction('login');
    try {
      const signedInUser = await loginWithEmail({
        email: emailCheck.normalized,
        password,
      });
      if (signedInUser.emailVerified) {
        onNotify('Bem-vindo de volta à resenha.');
      } else {
        setSuccessInfo(
          'Sua conta foi localizada, mas ainda falta confirmar o e-mail para salvar favoritos e criar listas.',
        );
      }
    } catch (err) {
      setBannerError(formatFirebaseAuthError(err, hostname, 'login'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    setSuccessInfo(null);

    const nameCheck = validateDisplayName(name);
    const emailCheck = validateEmail(email);
    const passCheck = validatePasswordForSignup(password);
    const confirmCheck = validatePasswordConfirmation(password, confirmPassword);

    setNameError(nameCheck.error);
    setEmailError(emailCheck.error);
    setPasswordError(passCheck.error);
    setConfirmError(confirmCheck.error);

    if (!nameCheck.valid) {
      nameRef.current?.focus();
      return;
    }
    if (!emailCheck.valid) {
      emailRef.current?.focus();
      return;
    }
    if (!passCheck.valid) {
      passwordRef.current?.focus();
      return;
    }
    if (!confirmCheck.valid) {
      confirmRef.current?.focus();
      return;
    }

    setBusyAction('signup');
    try {
      const createdUser = await registerWithEmail({
        name: nameCheck.normalized,
        email: emailCheck.normalized,
        password,
      });
      if (createdUser.emailVerified) {
        onNotify('Conta criada! Bem-vindo ao ResenhaPOA.');
      } else {
        setSuccessInfo(
          `Enviamos um link de confirmação para ${emailCheck.normalized}. Abra sua caixa de entrada (ou spam) para ativar todos os recursos.`,
        );
        onNotify('Conta criada! Confira seu e-mail para confirmar.');
      }
    } catch (err) {
      setBannerError(formatFirebaseAuthError(err, hostname, 'signup'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    setSuccessInfo(null);

    const emailCheck = validateEmail(email);
    setEmailError(emailCheck.error);
    if (!emailCheck.valid) {
      emailRef.current?.focus();
      return;
    }

    setBusyAction('reset');
    try {
      await sendPasswordReset(emailCheck.normalized);
      // Neutral anti-enumeration message
      setSuccessInfo(
        `Se existir uma conta vinculada a ${emailCheck.normalized}, enviamos um link de recuperação de senha para sua caixa de entrada. Verifique também o spam.`,
      );
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code ?? '')
          : '';
      // Do not leak whether an email is registered
      if (code === 'auth/user-not-found') {
        setSuccessInfo(
          `Se existir uma conta vinculada a ${emailCheck.normalized}, enviamos um link de recuperação de senha para sua caixa de entrada. Verifique também o spam.`,
        );
      } else {
        setBannerError(formatFirebaseAuthError(err, hostname, 'reset'));
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleResendVerification = async () => {
    setBusyAction('resend');
    setBannerError(null);
    try {
      await resendVerificationEmail();
      setSuccessInfo(
        `Novo link de confirmação enviado para ${user?.email || email}. Confira sua caixa de entrada e spam.`,
      );
    } catch (err) {
      setBannerError(formatFirebaseAuthError(err, hostname, 'verify'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckVerified = async () => {
    setBusyAction('refresh');
    setBannerError(null);
    try {
      const verified = await refreshAuthUser();
      if (verified) {
        onNotify('E-mail confirmado! Conta ativa no ResenhaPOA.');
      } else {
        setBannerError(
          'Ainda não identificamos a confirmação do seu e-mail. Clique no link enviado na sua caixa de entrada e tente novamente.',
        );
      }
    } catch (err) {
      setBannerError(formatFirebaseAuthError(err, hostname, 'verify'));
    } finally {
      setBusyAction(null);
    }
  };

  const modalEyebrow =
    authModalMode === 'signup'
      ? 'Criar conta'
      : authModalMode === 'reset'
        ? 'Recuperar acesso'
        : authModalMode === 'verify'
          ? 'Confirmação de e-mail'
          : 'Conta ResenhaPOA';

  const modalTitle =
    authModalMode === 'signup'
      ? 'Cria tua conta.'
      : authModalMode === 'reset'
        ? 'Recuperar senha'
        : authModalMode === 'verify'
          ? 'Confirma teu e-mail.'
          : 'Entra na resenha.';

  const modalSubtitle =
    authModalMode === 'signup'
      ? 'Salva teus rolês, organiza listas Bora Junto e acompanha a cena de Porto Alegre.'
      : authModalMode === 'reset'
        ? 'Informe seu e-mail cadastrado para receber o link de redefinição de senha.'
        : authModalMode === 'verify'
          ? authPromptReason ||
            `Enviamos um link de confirmação para ${user?.email || email || 'seu e-mail'}. Confirme para salvar favoritos e criar listas Bora Junto.`
          : authPromptReason || 'Cria tua conta ou entra pra salvar teus rolês.';

  const renderPasswordToggle = (visible: boolean, onToggle: () => void, label: string) => (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="w-10 h-10 rounded-lg flex items-center justify-center text-[#98989F] hover:text-[#F7F7F5] transition-colors"
    >
      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md w-full max-h-[90dvh] overflow-y-auto overscroll-contain bg-[#1C1C20] text-[#F7F7F5] border border-[#28282E] rounded-2xl p-6 sm:p-7 relative shadow-2xl">
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Fechar janela de autenticação"
          className="absolute right-4 top-4 w-10 h-10 rounded-full flex items-center justify-center border border-[#28282E] hover:border-[#F7F7F5] text-[#98989F] hover:text-[#F7F7F5] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="pr-10 mb-5">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF5A36] mb-1.5">
            {modalEyebrow}
          </p>
          <h2
            id="auth-modal-title"
            className="font-display text-3xl sm:text-[34px] font-extrabold italic uppercase tracking-tight leading-[1.02]"
          >
            {modalTitle}
          </h2>
          <p className="text-sm text-[#98989F] leading-relaxed mt-2">{modalSubtitle}</p>
        </div>

        {bannerError && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl border border-[#FF5A36]/60 bg-[#101012] text-xs sm:text-[13px] text-[#F7F7F5] leading-relaxed"
          >
            {bannerError}
          </div>
        )}

        {successInfo && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 p-3.5 rounded-xl border border-[#34D399]/50 bg-[#101012] text-xs sm:text-[13px] text-[#F7F7F5] leading-relaxed flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* MODE 1: LOGIN */}
        {authModalMode === 'login' && (
          <div className="space-y-4">
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              <ResenhaInput
                ref={emailRef}
                id="auth-login-email"
                type="email"
                sizeVariant="default"
                label="E-mail"
                placeholder="voce@email.com"
                value={email}
                error={emailError}
                maxLength={AUTH_LIMITS.EMAIL_MAX}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="next"
                disabled={isBusy}
                onChange={(e) => {
                  const next = e.target.value;
                  setEmail(next);
                  if (emailError && validateEmail(next).valid) setEmailError(null);
                  if (bannerError) setBannerError(null);
                }}
              />

              <div className="space-y-1.5">
                <ResenhaInput
                  ref={passwordRef}
                  id="auth-login-password"
                  type={showPassword ? 'text' : 'password'}
                  sizeVariant="default"
                  label="Senha"
                  placeholder="Digite sua senha"
                  value={password}
                  error={passwordError}
                  maxLength={AUTH_LIMITS.PASSWORD_MAX}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  disabled={isBusy}
                  rightSlot={renderPasswordToggle(
                    showPassword,
                    () => setShowPassword((v) => !v),
                    showPassword ? 'Ocultar senha' : 'Mostrar senha',
                  )}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPassword(next);
                    if (passwordError && next.length > 0) setPasswordError(null);
                    if (bannerError) setBannerError(null);
                  }}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => switchMode('reset')}
                    className="text-xs font-medium text-[#98989F] hover:text-[#FF5A36] py-1 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full min-h-[48px] py-3.5 px-5 bg-[#FF5A36] hover:bg-[#FF6F4F] active:scale-[0.99] disabled:opacity-60 text-[#101012] font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                {busyAction === 'login' ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            {/* Discreet divider */}
            <div className="relative py-1 flex items-center gap-3" aria-hidden="true">
              <span className="flex-1 h-px bg-[#28282E]" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#98989F]">
                ou
              </span>
              <span className="flex-1 h-px bg-[#28282E]" />
            </div>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleGoogleSignIn}
              className="w-full min-h-[48px] py-3 px-5 bg-[#101012] hover:bg-[#25252B] disabled:opacity-60 border border-[#28282E] hover:border-[#F7F7F5]/40 text-[#F7F7F5] font-bold text-xs uppercase tracking-wider rounded-xl inline-flex items-center justify-center gap-2.5 transition-colors"
            >
              <GoogleMark />
              <span>{busyAction === 'google' ? 'Conectando...' : 'Continuar com Google'}</span>
            </button>

            <div className="pt-2 border-t border-[#28282E] text-center text-xs text-[#98989F]">
              <span>Ainda não tem uma conta? </span>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchMode('signup')}
                className="font-bold text-[#F7F7F5] hover:text-[#FF5A36] underline underline-offset-4 py-1 transition-colors"
              >
                Criar conta
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: SIGNUP */}
        {authModalMode === 'signup' && (
          <div className="space-y-4">
            <form onSubmit={handleSignupSubmit} noValidate className="space-y-4">
              <ResenhaInput
                ref={nameRef}
                id="auth-signup-name"
                type="text"
                sizeVariant="default"
                label="Nome"
                placeholder="Como a galera te chama"
                value={name}
                error={nameError}
                maxLength={AUTH_LIMITS.NAME_MAX}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                disabled={isBusy}
                onChange={(e) => {
                  const next = e.target.value;
                  setName(next);
                  if (nameError && validateDisplayName(next).valid) setNameError(null);
                  if (bannerError) setBannerError(null);
                }}
              />

              <ResenhaInput
                ref={emailRef}
                id="auth-signup-email"
                type="email"
                sizeVariant="default"
                label="E-mail"
                placeholder="voce@email.com"
                value={email}
                error={emailError}
                maxLength={AUTH_LIMITS.EMAIL_MAX}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="next"
                disabled={isBusy}
                onChange={(e) => {
                  const next = e.target.value;
                  setEmail(next);
                  if (emailError && validateEmail(next).valid) setEmailError(null);
                  if (bannerError) setBannerError(null);
                }}
              />

              <div className="space-y-2">
                <ResenhaInput
                  ref={passwordRef}
                  id="auth-signup-password"
                  type={showPassword ? 'text' : 'password'}
                  sizeVariant="default"
                  label="Senha"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  error={passwordError}
                  maxLength={AUTH_LIMITS.PASSWORD_MAX}
                  autoComplete="new-password"
                  enterKeyHint="next"
                  disabled={isBusy}
                  rightSlot={renderPasswordToggle(
                    showPassword,
                    () => setShowPassword((v) => !v),
                    showPassword ? 'Ocultar senha' : 'Mostrar senha',
                  )}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPassword(next);
                    if (passwordError && validatePasswordForSignup(next).valid) {
                      setPasswordError(null);
                    }
                    if (confirmError && confirmPassword && next === confirmPassword) {
                      setConfirmError(null);
                    }
                    if (bannerError) setBannerError(null);
                  }}
                />
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#98989F]">
                  <li className="inline-flex items-center gap-1">
                    <Check
                      className={`w-3.5 h-3.5 ${
                        policyChecks.minLength ? 'text-[#34D399]' : 'text-[#52525B]'
                      }`}
                    />
                    <span className={policyChecks.minLength ? 'text-[#F7F7F5]' : undefined}>
                      8+ caracteres
                    </span>
                  </li>
                  <li className="inline-flex items-center gap-1">
                    <Check
                      className={`w-3.5 h-3.5 ${
                        policyChecks.hasLetter ? 'text-[#34D399]' : 'text-[#52525B]'
                      }`}
                    />
                    <span className={policyChecks.hasLetter ? 'text-[#F7F7F5]' : undefined}>
                      1 letra
                    </span>
                  </li>
                  <li className="inline-flex items-center gap-1">
                    <Check
                      className={`w-3.5 h-3.5 ${
                        policyChecks.hasNumber ? 'text-[#34D399]' : 'text-[#52525B]'
                      }`}
                    />
                    <span className={policyChecks.hasNumber ? 'text-[#F7F7F5]' : undefined}>
                      1 número
                    </span>
                  </li>
                </ul>
              </div>

              <ResenhaInput
                ref={confirmRef}
                id="auth-signup-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                sizeVariant="default"
                label="Confirmar senha"
                placeholder="Repita sua senha"
                value={confirmPassword}
                error={confirmError}
                maxLength={AUTH_LIMITS.PASSWORD_MAX}
                autoComplete="new-password"
                enterKeyHint="done"
                disabled={isBusy}
                rightSlot={renderPasswordToggle(
                  showConfirmPassword,
                  () => setShowConfirmPassword((v) => !v),
                  showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha',
                )}
                onChange={(e) => {
                  const next = e.target.value;
                  setConfirmPassword(next);
                  if (confirmError && next === password) setConfirmError(null);
                  if (bannerError) setBannerError(null);
                }}
              />

              <button
                type="submit"
                disabled={isBusy}
                className="w-full min-h-[48px] py-3.5 px-5 bg-[#FF5A36] hover:bg-[#FF6F4F] active:scale-[0.99] disabled:opacity-60 text-[#101012] font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                {busyAction === 'signup' ? 'Criando conta...' : 'Criar minha conta'}
              </button>
            </form>

            <div className="relative py-1 flex items-center gap-3" aria-hidden="true">
              <span className="flex-1 h-px bg-[#28282E]" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#98989F]">
                ou
              </span>
              <span className="flex-1 h-px bg-[#28282E]" />
            </div>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleGoogleSignIn}
              className="w-full min-h-[48px] py-3 px-5 bg-[#101012] hover:bg-[#25252B] disabled:opacity-60 border border-[#28282E] hover:border-[#F7F7F5]/40 text-[#F7F7F5] font-bold text-xs uppercase tracking-wider rounded-xl inline-flex items-center justify-center gap-2.5 transition-colors"
            >
              <GoogleMark />
              <span>{busyAction === 'google' ? 'Conectando...' : 'Continuar com Google'}</span>
            </button>

            <div className="pt-2 border-t border-[#28282E] text-center text-xs text-[#98989F]">
              <span>Já tem uma conta? </span>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchMode('login')}
                className="font-bold text-[#F7F7F5] hover:text-[#FF5A36] underline underline-offset-4 py-1 transition-colors"
              >
                Entrar
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: PASSWORD RECOVERY */}
        {authModalMode === 'reset' && (
          <div className="space-y-4">
            <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
              <ResenhaInput
                ref={emailRef}
                id="auth-reset-email"
                type="email"
                sizeVariant="default"
                label="E-mail da conta"
                placeholder="voce@email.com"
                value={email}
                error={emailError}
                maxLength={AUTH_LIMITS.EMAIL_MAX}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="done"
                disabled={isBusy}
                onChange={(e) => {
                  const next = e.target.value;
                  setEmail(next);
                  if (emailError && validateEmail(next).valid) setEmailError(null);
                  if (bannerError) setBannerError(null);
                }}
              />

              <button
                type="submit"
                disabled={isBusy}
                className="w-full min-h-[48px] py-3.5 px-5 bg-[#FF5A36] hover:bg-[#FF6F4F] active:scale-[0.99] disabled:opacity-60 text-[#101012] font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                {busyAction === 'reset' ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>

            <div className="pt-2 border-t border-[#28282E] flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 font-semibold text-[#F7F7F5] hover:text-[#FF5A36] py-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para entrar</span>
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchMode('signup')}
                className="text-[#98989F] hover:text-[#F7F7F5] py-1 transition-colors"
              >
                Criar conta
              </button>
            </div>
          </div>
        )}

        {/* MODE 4: EMAIL VERIFICATION */}
        {authModalMode === 'verify' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#101012] border border-[#28282E] flex items-start gap-3">
              <MailCheck className="w-5 h-5 text-[#FF5A36] shrink-0 mt-0.5" />
              <div className="text-xs text-[#98989F] leading-relaxed space-y-1">
                <p className="font-semibold text-[#F7F7F5]">
                  {user?.email || email || 'Seu e-mail cadastrado'}
                </p>
                <p>
                  Por segurança, o ResenhaPOA pede a confirmação do e-mail antes de salvar favoritos,
                  criar listas Bora Junto ou divulgar eventos.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleCheckVerified}
              className="w-full min-h-[48px] py-3.5 px-5 bg-[#FF5A36] hover:bg-[#FF6F4F] disabled:opacity-60 text-[#101012] font-extrabold text-xs uppercase tracking-wider rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${busyAction === 'refresh' ? 'animate-spin' : ''}`} />
              <span>{busyAction === 'refresh' ? 'Verificando...' : 'Já confirmei meu e-mail'}</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleResendVerification}
              className="w-full min-h-[44px] py-3 px-4 bg-[#101012] hover:bg-[#25252B] disabled:opacity-60 border border-[#28282E] text-[#F7F7F5] font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              {busyAction === 'resend' ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
            </button>

            <div className="pt-2 border-t border-[#28282E] flex items-center justify-between text-xs text-[#98989F]">
              <button
                type="button"
                disabled={isBusy}
                onClick={closeAuthModal}
                className="hover:text-[#F7F7F5] py-1 transition-colors"
              >
                Continuar navegando
              </button>
              {user && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    await logout();
                    switchMode('login');
                  }}
                  className="hover:text-[#FF5A36] underline py-1 transition-colors"
                >
                  Usar outra conta
                </button>
              )}
            </div>
          </div>
        )}

        <p className="mt-4 text-[11px] text-[#98989F] leading-relaxed">
          Seus dados seguem a LGPD e servem apenas para manter seus rolês salvos, listas e
          publicações.
        </p>
      </div>
    </div>
  );
};
