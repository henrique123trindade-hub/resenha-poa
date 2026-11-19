import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronDown,
  Heart,
  Home,
  MapPin,
  Menu,
  Plus,
  Search,
  Shield,
  Sparkles,
  User as UserIcon,
  Users,
  Wine,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BrandWordmark } from './BrandMark';
import { scrollToTopInstant } from '../utils/scrollNavigation';

interface ToastContextValue {
  notify: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    isAdmin,
    favorites,
    authModalOpen,
    authPromptReason,
    openAuthModal,
    closeAuthModal,
    loginWithGoogle,
    logout,
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const exploreRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setExploreOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => {
      setHeaderScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExploreOpen(false);
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3000);
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(q ? `/eventos?q=${encodeURIComponent(q)}` : '/eventos');
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      notify('Sessão iniciada com sucesso.');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Não foi possível entrar com o Google.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative text-sm font-medium whitespace-nowrap shrink-0 transition-colors py-1.5 border-b-2 ${
      isActive
        ? 'text-[#F7F7F5] border-[#FF5A36]'
        : 'text-[#98989F] border-transparent hover:text-[#F7F7F5] hover:border-[#28282E]'
    }`;

  return (
    <ToastContext.Provider value={{ notify }}>
      <div id="top" className="min-h-screen flex flex-col bg-[#101012] text-[#F7F7F5]">
        {/* ResenhaPOA Compact Sticky Nightlife Header */}
        <header
          className={`sticky top-0 z-40 text-[#F7F7F5] border-b transition-all duration-200 ${
            headerScrolled
              ? 'bg-[#101012]/96 backdrop-blur-lg border-[#28282E] shadow-[0_10px_30px_rgba(0,0,0,0.45)]'
              : 'bg-[#101012]/90 backdrop-blur-md border-[#28282E]/70'
          }`}
        >
          <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 lg:gap-6">
            {/* Zone 1: Brand Wordmark */}
            <Link
              to="/"
              onClick={scrollToTopInstant}
              aria-label="ResenhaPOA, página inicial"
              className="shrink-0 flex items-center"
            >
              <BrandWordmark size="md" tone="on-dark" />
            </Link>

            {/* Zone 2: Clean Single-Line Editorial Navigation */}
            <nav
              className="hidden lg:flex items-center gap-7"
              aria-label="Navegação principal"
            >
              <NavLink to="/" end className={navLinkClass}>
                Início
              </NavLink>
              <NavLink to="/eventos" className={navLinkClass}>
                Eventos
              </NavLink>
              <NavLink to="/bares" className={navLinkClass}>
                Bares
              </NavLink>

              {/* Explorar Dropdown */}
              <div className="relative" ref={exploreRef}>
                <button
                  type="button"
                  onClick={() => setExploreOpen((v) => !v)}
                  aria-expanded={exploreOpen}
                  aria-haspopup="menu"
                  className={`inline-flex items-center gap-1.5 text-sm font-medium py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    exploreOpen
                      ? 'text-[#F7F7F5] border-[#FF5A36]'
                      : 'text-[#98989F] border-transparent hover:text-[#F7F7F5] hover:border-[#28282E]'
                  }`}
                >
                  <span>Explorar</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-150 ${exploreOpen ? 'rotate-180 text-[#FF5A36]' : ''}`}
                  />
                </button>

                {exploreOpen && (
                  <div
                    role="menu"
                    className="motion-safe:animate-menu-in absolute left-0 top-full mt-3 w-72 bg-[#1C1C20] text-[#F7F7F5] border border-[#28282E] rounded-xl shadow-2xl p-2 z-50"
                  >
                    <Link
                      to="/mapa"
                      role="menuitem"
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#25252B] transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-[#5265FF] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-sm font-semibold">Mapa de rolês</span>
                        <span className="block text-xs text-[#98989F]">
                          Festas e bares perto de ti em POA
                        </span>
                      </div>
                    </Link>
                    <Link
                      to="/bora-junto"
                      role="menuitem"
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#25252B] transition-colors"
                    >
                      <Users className="w-4 h-4 text-[#FF5A36] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-sm font-semibold">Bora Junto</span>
                        <span className="block text-xs text-[#98989F]">
                          Crie listas para votar com a galera
                        </span>
                      </div>
                    </Link>
                    <Link
                      to="/curadoria"
                      role="menuitem"
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#25252B] transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-[#FF5A36] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-sm font-semibold">Curadoria inteligente</span>
                        <span className="block text-xs text-[#98989F]">
                          Busque rolês e monte roteiros
                        </span>
                      </div>
                    </Link>
                    <div className="my-1.5 border-t border-[#28282E]" />
                    <Link
                      to="/sobre"
                      role="menuitem"
                      className="block px-3 py-2 rounded-lg text-xs font-medium text-[#98989F] hover:text-[#F7F7F5] hover:bg-[#25252B] transition-colors"
                    >
                      Sobre o ResenhaPOA
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            {/* Zone 3: Compact Utility Icons + Single Primary Action */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen((v) => !v);
                }}
                aria-label={searchOpen ? 'Fechar pesquisa rápida' : 'Abrir pesquisa rápida'}
                aria-expanded={searchOpen}
                className={`w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-colors ${
                  searchOpen
                    ? 'bg-[#25252B] border-[#FF5A36]/60 text-[#FF5A36]'
                    : 'bg-[#1C1C20] border-[#28282E] text-[#F7F7F5] hover:bg-[#25252B] hover:border-[#F7F7F5]/30'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>

              <Link
                to="/favoritos"
                aria-label={
                  favorites.length > 0 ? `Favoritos (${favorites.length} salvos)` : 'Favoritos'
                }
                className="hidden sm:inline-flex relative w-9 h-9 rounded-full bg-[#1C1C20] border border-[#28282E] hover:bg-[#25252B] hover:border-[#F7F7F5]/30 text-[#F7F7F5] items-center justify-center transition-colors"
              >
                <Heart
                  className={`w-4 h-4 ${favorites.length > 0 ? 'text-[#FF5A36]' : 'text-[#F7F7F5]'}`}
                  fill={favorites.length > 0 ? 'currentColor' : 'none'}
                />
                {favorites.length > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF5A36]"
                  />
                )}
                {favorites.length > 0 && (
                  <span className="sr-only">({favorites.length})</span>
                )}
              </Link>

              {user ? (
                <Link
                  to="/perfil"
                  aria-label="Minha conta"
                  className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold px-2.5 h-9 rounded-full bg-[#1C1C20] border border-[#28282E] hover:bg-[#25252B] hover:border-[#F7F7F5]/30 text-[#F7F7F5] transition-colors whitespace-nowrap shrink-0"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Conta'}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                  <span className="max-w-[76px] truncate">
                    {(user.displayName || 'Conta').split(' ')[0]}
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('Entre para salvar rolês e criar listas Bora Junto.')}
                  aria-label="Entrar na conta"
                  className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#1C1C20] border border-[#28282E] hover:bg-[#25252B] hover:border-[#F7F7F5]/30 text-[#F7F7F5] transition-colors shrink-0"
                >
                  <UserIcon className="w-4 h-4" />
                </button>
              )}

              <Link
                to="/organizador"
                className="hidden md:inline-flex items-center gap-1.5 bg-[#FF5A36] hover:bg-[#FF6F4F] active:scale-[0.98] text-[#101012] font-bold text-xs tracking-wide px-4 h-9 rounded-full transition-all whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Divulgar Evento</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setMobileMenuOpen((v) => !v);
                }}
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileMenuOpen}
                className={`lg:hidden w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                  mobileMenuOpen
                    ? 'bg-[#25252B] border-[#FF5A36]/60 text-[#FF5A36]'
                    : 'bg-[#1C1C20] border-[#28282E] text-[#F7F7F5] hover:bg-[#25252B]'
                }`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Inline Search Drawer */}
          {searchOpen && (
            <div className="motion-safe:animate-menu-in border-t border-[#28282E] bg-[#1C1C20]">
              <form
                onSubmit={handleQuickSearch}
                className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-3 flex items-center gap-3"
              >
                <Search className="w-4 h-4 text-[#98989F] shrink-0" />
                <input
                  type="search"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="Buscar festas, bares, artistas ou bairros de POA..."
                  aria-label="Buscar eventos e bares em Porto Alegre"
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none py-1.5"
                />
                <button
                  type="submit"
                  className="bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] font-bold text-xs px-4 py-2 rounded-full whitespace-nowrap shrink-0 transition-colors"
                >
                  Buscar
                </button>
              </form>
            </div>
          )}

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="motion-safe:animate-menu-in lg:hidden border-t border-[#28282E] bg-[#1C1C20] px-5 py-5 space-y-4">
              <nav className="grid grid-cols-2 gap-2.5" aria-label="Menu mobile">
                <Link
                  to="/eventos"
                  onClick={scrollToTopInstant}
                  className="px-3.5 py-3 min-h-[44px] rounded-xl bg-[#101012] border border-[#28282E] hover:border-[#FF5A36]/60 text-xs font-semibold text-[#F7F7F5] flex items-center gap-2 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-[#FF5A36]" /> Eventos
                </Link>
                <Link
                  to="/bares"
                  onClick={scrollToTopInstant}
                  className="px-3.5 py-3 min-h-[44px] rounded-xl bg-[#101012] border border-[#28282E] hover:border-[#FF5A36]/60 text-xs font-semibold text-[#F7F7F5] flex items-center gap-2 transition-colors"
                >
                  <Wine className="w-4 h-4 text-[#FF5A36]" /> Bares
                </Link>
                <Link
                  to="/mapa"
                  onClick={scrollToTopInstant}
                  className="px-3.5 py-3 min-h-[44px] rounded-xl bg-[#101012] border border-[#28282E] hover:border-[#5265FF]/60 text-xs font-semibold text-[#F7F7F5] flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[#5265FF]" /> Mapa
                </Link>
                <Link
                  to="/bora-junto"
                  onClick={scrollToTopInstant}
                  className="px-3.5 py-3 min-h-[44px] rounded-xl bg-[#101012] border border-[#28282E] hover:border-[#FF5A36]/60 text-xs font-semibold text-[#F7F7F5] flex items-center gap-2 transition-colors"
                >
                  <Users className="w-4 h-4 text-[#FF5A36]" /> Bora Junto
                </Link>
                <Link
                  to="/curadoria"
                  onClick={scrollToTopInstant}
                  className="px-3.5 py-3 min-h-[44px] rounded-xl bg-[#101012] border border-[#28282E] hover:border-[#FF5A36]/60 text-xs font-semibold text-[#F7F7F5] flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#FF5A36]" /> Curadoria
                </Link>
                <Link
                  to="/organizador"
                  onClick={scrollToTopInstant}
                  className="px-3.5 py-3 min-h-[44px] rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-xs font-bold text-[#101012] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" /> Divulgar Evento
                </Link>
              </nav>

              <div className="pt-3 border-t border-[#28282E] flex items-center justify-between gap-3">
                {user ? (
                  <>
                    <Link
                      to="/perfil"
                      onClick={scrollToTopInstant}
                      className="text-sm font-medium text-[#F7F7F5] flex items-center gap-2 min-h-[44px]"
                    >
                      <UserIcon className="w-4 h-4 text-[#98989F]" />
                      {user.displayName || user.email}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="text-xs text-[#98989F] hover:text-[#F7F7F5] underline min-h-[44px] px-2"
                    >
                      Sair
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('Entre com sua conta Google para salvar favoritos e enviar eventos.');
                    }}
                    className="w-full py-3 min-h-[44px] rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/40 text-[#F7F7F5] text-xs font-bold transition-colors"
                  >
                    Entrar com Google
                  </button>
                )}
              </div>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={scrollToTopInstant}
                  className="block px-3.5 py-3 rounded-xl bg-[#101012] border border-[#FF5A36]/50 text-xs font-bold text-[#F7F7F5]"
                >
                  Painel Administrativo
                </Link>
              )}
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>

        {/* Mobile Bottom Navigation */}
        <nav
          aria-label="Navegação rápida mobile"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#101012]/96 backdrop-blur-lg border-t border-[#28282E] grid grid-cols-5 h-14 pb-[env(safe-area-inset-bottom)]"
        >
          <NavLink
            to="/"
            end
            onClick={scrollToTopInstant}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
                isActive ? 'text-[#FF5A36]' : 'text-[#98989F]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 w-7 h-0.5 rounded-full bg-[#FF5A36]"
                  />
                )}
                <Home className="w-[18px] h-[18px]" />
                <span>Início</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/eventos"
            onClick={scrollToTopInstant}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
                isActive ? 'text-[#FF5A36]' : 'text-[#98989F]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 w-7 h-0.5 rounded-full bg-[#FF5A36]"
                  />
                )}
                <Calendar className="w-[18px] h-[18px]" />
                <span>Eventos</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/bares"
            onClick={scrollToTopInstant}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
                isActive ? 'text-[#FF5A36]' : 'text-[#98989F]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 w-7 h-0.5 rounded-full bg-[#FF5A36]"
                  />
                )}
                <Wine className="w-[18px] h-[18px]" />
                <span>Bares</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/mapa"
            onClick={scrollToTopInstant}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
                isActive ? 'text-[#5265FF]' : 'text-[#98989F]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5265FF]"
                  />
                )}
                <MapPin className="w-[18px] h-[18px]" />
                <span>Mapa</span>
              </>
            )}
          </NavLink>
          <NavLink
            to={user ? '/perfil' : '/favoritos'}
            onClick={scrollToTopInstant}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
                isActive ? 'text-[#FF5A36]' : 'text-[#98989F]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 w-7 h-0.5 rounded-full bg-[#FF5A36]"
                  />
                )}
                {user ? <UserIcon className="w-[18px] h-[18px]" /> : <Heart className="w-[18px] h-[18px]" />}
                <span>{user ? 'Perfil' : 'Salvos'}</span>
              </>
            )}
          </NavLink>
        </nav>

        {/* Nightlife Editorial Footer */}
        <footer className="bg-[#101012] text-[#F7F7F5] pt-14 pb-24 lg:pb-12 border-t border-[#28282E]">
          <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#28282E]">
              <div className="md:col-span-5 space-y-4">
                <Link to="/" className="inline-block">
                  <BrandWordmark size="lg" tone="on-dark" />
                </Link>
                <p className="text-sm text-[#98989F] max-w-md leading-relaxed">
                  O teu próximo rolê começa aqui. Plataforma independente para descobrir festas,
                  baladas, bares, shows e cultura urbana em Porto Alegre.
                </p>
              </div>

              <div className="md:col-span-3 space-y-3">
                <h2 className="font-label text-xs font-bold uppercase tracking-[0.12em] text-[#F7F7F5]">
                  Descobrir
                </h2>
                <ul className="space-y-2.5 text-sm text-[#98989F]">
                  <li>
                    <Link to="/eventos" className="hover:text-[#F7F7F5] transition-colors">
                      Eventos em Porto Alegre
                    </Link>
                  </li>
                  <li>
                    <Link to="/bares" className="hover:text-[#F7F7F5] transition-colors">
                      Bares para conhecer
                    </Link>
                  </li>
                  <li>
                    <Link to="/mapa" className="hover:text-[#F7F7F5] transition-colors">
                      Mapa interativo
                    </Link>
                  </li>
                  <li>
                    <Link to="/bora-junto" className="hover:text-[#F7F7F5] transition-colors">
                      Bora Junto com amigos
                    </Link>
                  </li>
                  <li>
                    <Link to="/curadoria" className="hover:text-[#F7F7F5] transition-colors">
                      Curadoria inteligente
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-4 space-y-3">
                <h2 className="font-label text-xs font-bold uppercase tracking-[0.12em] text-[#F7F7F5]">
                  Cena e transparência
                </h2>
                <ul className="space-y-2.5 text-sm text-[#98989F]">
                  <li>
                    <Link to="/organizador" className="hover:text-[#FF5A36] transition-colors">
                      Divulgar meu evento
                    </Link>
                  </li>
                  <li>
                    <Link to="/sobre" className="hover:text-[#F7F7F5] transition-colors">
                      Sobre o ResenhaPOA
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacidade" className="hover:text-[#F7F7F5] transition-colors">
                      Privacidade (LGPD)
                    </Link>
                  </li>
                  <li>
                    <Link to="/termos" className="hover:text-[#F7F7F5] transition-colors">
                      Termos de uso
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/politica-de-conteudo"
                      className="hover:text-[#F7F7F5] transition-colors"
                    >
                      Política de conteúdo e classificação etária
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link
                        to="/admin"
                        className="inline-flex items-center gap-1.5 text-[#FF5A36] hover:underline"
                      >
                        <Shield className="w-3.5 h-3.5" /> Painel Administrativo
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#98989F]">
              <span>ResenhaPOA · Porto Alegre — RS</span>
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[#F7F7F5] hover:text-[#FF5A36] transition-colors"
              >
                Voltar ao topo ↑
              </a>
            </div>
          </div>
        </footer>

        {/* Auth Modal */}
        {authModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-[#1C1C20] text-[#F7F7F5] border border-[#28282E] rounded-2xl p-6 sm:p-8 relative shadow-2xl">
              <button
                type="button"
                onClick={closeAuthModal}
                aria-label="Fechar janela de login"
                className="absolute right-4 top-4 w-9 h-9 rounded-full flex items-center justify-center border border-[#28282E] hover:border-[#F7F7F5] text-[#98989F] hover:text-[#F7F7F5] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF5A36] mb-2">
                Conta ResenhaPOA
              </p>
              <h2
                id="auth-modal-title"
                className="font-display text-3xl font-extrabold italic uppercase tracking-tight mb-3"
              >
                Entre com sua conta Google
              </h2>
              <p className="text-sm text-[#98989F] leading-relaxed mb-6">
                {authPromptReason ||
                  'A navegação é livre. Entre apenas para salvar favoritos, criar enquetes Bora Junto ou divulgar eventos.'}
              </p>

              {authError && (
                <div className="mb-4 p-3 rounded-xl border border-[#FF5A36]/50 bg-[#101012] text-xs text-[#F7F7F5]">
                  {authError}
                </div>
              )}

              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-5 bg-[#FF5A36] hover:bg-[#FF6F4F] disabled:opacity-60 text-[#101012] font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                {authLoading ? 'Conectando...' : 'Continuar com Google'}
              </button>

              <p className="mt-4 text-xs text-[#98989F] leading-relaxed">
                Seus dados seguem a LGPD e servem apenas para manter seus rolês salvos, listas e
                publicações.
              </p>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMsg && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-16 lg:bottom-6 right-4 sm:right-6 z-50 bg-[#F7F7F5] text-[#101012] border border-[#101012]/10 rounded-xl font-semibold text-xs px-5 py-3 shadow-2xl"
          >
            {toastMsg}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};
