import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Heart, LogOut, MailCheck, Pencil, RefreshCw, Shield, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCatalog } from '../contexts/CatalogContext';
import { EventCard } from '../components/EventCard';
import { VenueCard } from '../components/VenueCard';
import { SectionKicker } from '../components/BrandMark';
import { ResenhaInput } from '../components/FormField';
import { fetchUserPollLists } from '../services/firestoreService';
import type { PollListItem } from '../types/resenha';
import { useToast } from '../components/Layout';
import { AUTH_LIMITS, getDisplayInitials, validateDisplayName } from '../utils/authValidation';
import { formatFirebaseAuthError } from '../utils/authError';

export const FavoritesProfilePage: React.FC<{ mode: 'favorites' | 'profile' }> = ({ mode }) => {
  const {
    user,
    profile,
    favorites,
    isAdmin,
    isEmailVerified,
    authProvider,
    openAuthModal,
    requireVerifiedAccount,
    resendVerificationEmail,
    refreshAuthUser,
    logout,
    updateDisplayName,
    updatePreferences,
  } = useAuth();
  const { events, venues, categories, neighborhoods } = useCatalog();
  const { notify } = useToast();

  const [prefCats, setPrefCats] = useState<string[]>(profile?.favoriteCategories || []);
  const [prefNeighs, setPrefNeighs] = useState<string[]>(profile?.favoriteNeighborhoods || []);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [myPolls, setMyPolls] = useState<PollListItem[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState<null | 'refresh' | 'resend'>(null);

  useEffect(() => {
    setPrefCats(profile?.favoriteCategories || []);
    setPrefNeighs(profile?.favoriteNeighborhoods || []);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchUserPollLists(user.uid)
      .then(setMyPolls)
      .catch(() => {});
  }, [user]);

  const savedEvents = favorites
    .filter((f) => f.targetType === 'event')
    .map((f) => events.find((e) => e.id === f.targetId))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const savedVenues = favorites
    .filter((f) => f.targetType === 'venue')
    .map((f) => venues.find((v) => v.id === f.targetId))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  const toggleCat = (id: string) => {
    setPrefCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleNeigh = (name: string) => {
    setPrefNeighs((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };

  const handleSavePreferences = async () => {
    if (!requireVerifiedAccount('Confirme seu e-mail para salvar suas preferências.')) return;
    setSavingPrefs(true);
    try {
      await updatePreferences(prefCats, prefNeighs);
      notify('Preferências atualizadas na sua conta.');
    } catch {
      notify('Não foi possível salvar preferências.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleStartEditName = () => {
    setNameDraft(profile?.displayName || user?.displayName || '');
    setNameError(null);
    setEditingName(true);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateDisplayName(nameDraft);
    if (!check.valid) {
      setNameError(check.error);
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateDisplayName(check.normalized);
      setEditingName(false);
      notify('Nome atualizado no seu perfil.');
    } catch {
      notify('Não foi possível atualizar seu nome agora.');
    } finally {
      setSavingName(false);
    }
  };

  const handleVerifyRefresh = async () => {
    setVerifyBusy('refresh');
    try {
      const ok = await refreshAuthUser();
      notify(
        ok
          ? 'E-mail confirmado! Sua conta está ativa.'
          : 'Ainda não identificamos a confirmação. Clique no link enviado ao seu e-mail.',
      );
    } catch (err) {
      notify(formatFirebaseAuthError(err, window.location.hostname, 'verify'));
    } finally {
      setVerifyBusy(null);
    }
  };

  const handleVerifyResend = async () => {
    setVerifyBusy('resend');
    try {
      await resendVerificationEmail();
      notify('Enviamos um novo link de confirmação para o seu e-mail.');
    } catch (err) {
      notify(formatFirebaseAuthError(err, window.location.hostname, 'verify'));
    } finally {
      setVerifyBusy(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-[780px] mx-auto px-4 py-20 text-center space-y-5 text-[#F7F7F5]">
        <div className="w-16 h-16 rounded-2xl bg-[#1C1C20] border border-[#28282E] flex items-center justify-center mx-auto">
          <Heart className="w-7 h-7 text-[#FF5A36]" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          {mode === 'favorites' ? 'Seus rolês salvos' : 'Sua conta ResenhaPOA'}
        </h1>
        <p className="text-sm sm:text-base text-[#98989F] max-w-md mx-auto leading-relaxed">
          Entre ou crie sua conta para manter eventos e bares salvos entre dispositivos, definir
          seus bairros preferidos e acompanhar suas listas Bora Junto.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openAuthModal('Entre para acessar seus favoritos e perfil.', 'login')}
            className="px-6 py-3.5 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
          >
            Entrar ou criar conta
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.displayName || user.displayName || 'Explorador POA';
  const accountBadge = !isEmailVerified
    ? 'E-mail pendente de confirmação'
    : authProvider === 'google'
      ? 'Conta verificada · Google'
      : 'Conta verificada · E-mail';

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 text-[#F7F7F5]">
      {!isEmailVerified && (
        <div className="rounded-2xl bg-[#1C1C20] border border-[#FF5A36]/60 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MailCheck className="w-5 h-5 text-[#FF5A36] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#F7F7F5]">Confirme seu e-mail para ativar tudo</p>
              <p className="text-xs text-[#98989F] leading-relaxed">
                Enviamos um link de confirmação para <strong className="text-[#F7F7F5]">{user.email}</strong>.
                Depois de clicar no link, confirme abaixo para salvar favoritos e criar listas Bora Junto.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              disabled={verifyBusy !== null}
              onClick={handleVerifyRefresh}
              className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] disabled:opacity-60 text-[#101012] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifyBusy === 'refresh' ? 'animate-spin' : ''}`} />
              <span>{verifyBusy === 'refresh' ? 'Verificando...' : 'Já confirmei'}</span>
            </button>
            <button
              type="button"
              disabled={verifyBusy !== null}
              onClick={handleVerifyResend}
              className="px-4 py-2.5 min-h-[42px] rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 disabled:opacity-60 text-[#F7F7F5] text-xs font-bold uppercase tracking-wider transition-colors"
            >
              {verifyBusy === 'resend' ? 'Enviando...' : 'Reenviar link'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-[#FF5A36]/60 shrink-0"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-14 h-14 rounded-full bg-[#FF5A36] text-[#101012] font-display text-xl font-extrabold flex items-center justify-center shrink-0"
              >
                {getDisplayInitials(displayName, user.email)}
              </div>
            )}
            <div className="min-w-0">
              <p
                className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                  isEmailVerified ? 'text-[#D5FF52]' : 'text-[#FF5A36]'
                }`}
              >
                {accountBadge}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight truncate">
                  {displayName}
                </h1>
                {!editingName && (
                  <button
                    type="button"
                    onClick={handleStartEditName}
                    aria-label="Editar nome do perfil"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/50 text-[11px] font-semibold text-[#98989F] hover:text-[#F7F7F5] transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Editar nome</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-[#98989F] truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2.5 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
              >
                <Shield className="w-4 h-4" /> Painel Admin
              </Link>
            )}
            <Link
              to="/organizador"
              className="px-4 py-2.5 rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-[#F7F7F5] text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Área do Organizador
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="px-4 py-2.5 rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-xs font-bold uppercase tracking-wider text-[#98989F] hover:text-[#F7F7F5] inline-flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>

        {editingName && (
          <form
            onSubmit={handleSaveName}
            noValidate
            className="pt-5 border-t border-[#28282E] flex flex-col sm:flex-row sm:items-end gap-3"
          >
            <div className="flex-1 min-w-0 max-w-md">
              <ResenhaInput
                id="profile-display-name"
                type="text"
                sizeVariant="default"
                label="Nome no ResenhaPOA"
                placeholder="Digite seu nome"
                value={nameDraft}
                error={nameError}
                maxLength={AUTH_LIMITS.NAME_MAX}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="done"
                disabled={savingName}
                onChange={(e) => {
                  setNameDraft(e.target.value);
                  if (nameError && validateDisplayName(e.target.value).valid) setNameError(null);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingName}
                className="px-4 min-h-[48px] rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] disabled:opacity-60 text-[#101012] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{savingName ? 'Salvando...' : 'Salvar'}</span>
              </button>
              <button
                type="button"
                disabled={savingName}
                onClick={() => {
                  setEditingName(false);
                  setNameError(null);
                }}
                className="px-4 min-h-[48px] rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/50 text-xs font-bold uppercase tracking-wider text-[#98989F] hover:text-[#F7F7F5] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Saved Events & Bars */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#28282E] pb-4">
          <div>
            <SectionKicker label="Sua lista" className="mb-1.5" />
            <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight">
              Rolês e bares salvos ({favorites.length})
            </h2>
          </div>
          <Link
            to="/eventos"
            className="text-xs font-bold uppercase tracking-wider text-[#FF5A36] hover:underline"
          >
            Explorar mais →
          </Link>
        </div>

        {savedEvents.length === 0 && savedVenues.length === 0 ? (
          <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-8 text-center space-y-4">
            <p className="text-sm text-[#98989F]">
              Você ainda não salvou eventos ou bares. Toque no coração em qualquer card para guardar aqui.
            </p>
            <Link
              to="/eventos"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
            >
              Descobrir eventos
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {savedEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedEvents.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            )}
            {savedVenues.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {savedVenues.map((v) => (
                  <VenueCard key={v.id} venue={v} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Bora Junto Lists */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#28282E] pb-4">
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#FF5A36]" /> Minhas listas Bora Junto
          </h2>
          <Link
            to="/bora-junto"
            className="text-xs font-bold uppercase tracking-wider text-[#FF5A36] hover:underline"
          >
            + Nova lista
          </Link>
        </div>
        {myPolls.length === 0 ? (
          <p className="text-sm text-[#98989F]">Você ainda não criou listas compartilhadas.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myPolls.map((p) => (
              <Link
                key={p.id}
                to={`/bora-junto/${p.id}`}
                className="p-5 rounded-2xl bg-[#1C1C20] border border-[#28282E] hover:border-[#FF5A36] space-y-2 transition-colors"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#98989F]">
                  <span className={p.isOpen ? 'text-[#D5FF52]' : 'text-[#98989F]'}>
                    {p.isOpen ? 'Aberta' : 'Encerrada'}
                  </span>{' '}
                  · {p.options.length} opções
                </p>
                <p className="font-display text-xl font-bold uppercase text-[#F7F7F5]">{p.title}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <SectionKicker label="Recomendações reais" accentColor="#5265FF" className="mb-2" />
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight">
            Suas preferências em POA
          </h2>
          <p className="text-xs text-[#98989F] mt-1">
            Escolha os estilos musicais e regiões que você mais curte — usamos isso na seção
            &ldquo;Selecionado pra tua vibe&rdquo; na página inicial.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F7F7F5] mb-2">
              Estilos
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = prefCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      active
                        ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                        : 'bg-[#101012] border-[#28282E] text-[#F7F7F5] hover:border-[#F7F7F5]/60'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F7F7F5] mb-2">
              Bairros
            </p>
            <div className="flex flex-wrap gap-2">
              {neighborhoods.map((n) => {
                const active = prefNeighs.includes(n.name);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => toggleNeigh(n.name)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      active
                        ? 'bg-[#5265FF] border-[#5265FF] text-white'
                        : 'bg-[#101012] border-[#28282E] text-[#F7F7F5] hover:border-[#F7F7F5]/60'
                    }`}
                  >
                    {n.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={savingPrefs}
          onClick={handleSavePreferences}
          className="px-6 py-3 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] disabled:opacity-60 text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
        >
          {savingPrefs ? 'Salvando...' : 'Salvar preferências'}
        </button>
      </section>
    </div>
  );
};
