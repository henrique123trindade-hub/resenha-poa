import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bookmark,
  Calendar,
  ChevronDown,
  Home,
  MapPin,
  Menu,
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
    const onDocClick = (e: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
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
    `text-xs font-semibold uppercase tracking-[0.08em] whitespace-nowrap shrink-0 transition-colors py-1.5 border-b-2 ${
      isActive
        ? 'text-[#F4F4F2] border-[#F4F4F2]'
        : 'text-[#858585] border-transparent hover:text-[#F4F4F2]'
    }`;

  return (
    <ToastContext.Provider value={{ notify }}>
      <div id="top" className="min-h-screen flex flex-col bg-[#080808] text-[#F4F4F2]">
        {/* Monochrome Nightlife Header */}
        <header className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-sm text-[#F4F4F2] border-b border-[#292929]">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
            {/* Left: Brand Logo */}
            <Link to="/" aria-label="ResenhaPOA, página inicial" className="shrink-0">
              <BrandWordmark size="md" tone="on-dark" />
            </Link>

            {/* Center: Clean Editorial Navigation */}
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

              {/* Explore Dropdown */}
              <div className="relative" ref={exploreRef}>
                <button
                  type="button"
                  onClick={() => setExploreOpen((v) => !v)}
                  aria-expanded={exploreOpen}
                  className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    exploreOpen
                      ? 'text-[#F4F4F2] border-[#F4F4F2]'
                      : 'text-[#858585] border-transparent hover:text-[#F4F4F2]'
                  }`}
                >
                  <span>Explore</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${exploreOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {exploreOpen && (
                  <div className="absolute left-0 top-full mt-3 w-64 bg-[#141414] text-[#F4F4F2] border border-[#292929] rounded-md shadow-2xl p-2 z-50">
                    <Link
                      to="/mapa"
                      className="flex items-start gap-3 p-2.5 rounded hover:bg-[#1E1E1E] transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-[#F4F4F2] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-sm font-semibold">Mapa de rolês</span>
                        <span className="block text-xs text-[#858585]">
                          Festas e bares perto de ti
                        </span>
                      </div>
                    </Link>
                    <Link
                      to="/bora-junto"
                      className="flex items-start gap-3 p-2.5 rounded hover:bg-[#1E1E1E] transition-colors"
                    >
                      <Users className="w-4 h-4 text-[#F4F4F2] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-sm font-semibold">Bora Junto</span>
                        <span className="block text-xs text-[#858585]">
                          Crie listas para votar com a galera
                        </span>
                      </div>
                    </Link>
                    <Link
                      to="/curadoria"
                      className="flex items-start gap-3 p-2.5 rounded hover:bg-[#1E1E1E] transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-[#F4F4F2] shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-sm font-semibold">Curadoria inteligente</span>
                        <span className="block text-xs text-[#858585]">
                          Busque rolês e monte roteiros
                        </span>
                      </div>
                    </Link>
                    <div className="my-1.5 border-t border-[#292929]" />
                    <Link
                      to="/sobre"
                      className="block px-3 py-2 rounded text-xs font-medium text-[#858585] hover:text-[#F4F4F2] hover:bg-[#1E1E1E]"
                    >
                      Sobre o ResenhaPOA
                    </Link>
                  </div>
                )}
              </div>

              <NavLink to="/favoritos" className={navLinkClass}>
                <span>Favoritos</span>
                {favorites.length > 0 && (
                  <span className="ml-1.5 text-[11px] text-[#858585] tabular-nums">
                    ({favorites.length})
                  </span>
                )}
              </NavLink>
            </nav>

            {/* Right: Search, Account, White Primary CTA */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Abrir pesquisa rápida"
                aria-expanded={searchOpen}
                className="w-9 h-9 rounded-md flex items-center justify-center text-[#F4F4F2] hover:bg-[#141414] transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>

              {user ? (
                <Link
                  to="/perfil"
                  aria-label="Minha conta"
                  className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold px-2.5 h-9 rounded-md text-[#F4F4F2] hover:bg-[#141414] transition-colors whitespace-nowrap shrink-0"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Conta'}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover grayscale"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                  <span className="max-w-[84px] truncate">
                    {(user.displayName || 'Conta').split(' ')[0]}
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('Entre para salvar rolês e criar listas Bora Junto.')}
                  aria-label="Entrar na conta"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 h-9 rounded-md text-[#F4F4F2] hover:bg-[#141414] transition-colors whitespace-nowrap shrink-0"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Conta</span>
                </button>
              )}

              <Link
                to="/organizador"
                className="hidden md:inline-flex items-center gap-1.5 bg-[#F4F4F2] hover:bg-white text-[#080808] font-bold text-xs uppercase tracking-[0.06em] px-4 h-9 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <span>Divulgar evento</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileMenuOpen}
                className="lg:hidden w-10 h-10 rounded-md flex items-center justify-center text-[#F4F4F2] hover:bg-[#141414]"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Inline Search Bar */}
          {searchOpen && (
            <div className="border-t border-[#292929] bg-[#141414]">
              <form
                onSubmit={handleQuickSearch}
                className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3"
              >
                <Search className="w-4 h-4 text-[#858585] shrink-0" />
                <input
                  type="search"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="Buscar evento, bar ou bairro..."
                  aria-label="Buscar evento, bar ou bairro"
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-[#F4F4F2] placeholder:text-[#858585] focus:outline-none py-1.5"
                />
                <button
                  type="submit"
                  className="bg-[#F4F4F2] hover:bg-white text-[#080808] font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-md whitespace-nowrap shrink-0"
                >
                  Buscar
                </button>
              </form>
            </div>
          )}

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-[#292929] bg-[#141414] px-4 py-5 space-y-4">
              <nav className="grid grid-cols-2 gap-2.5" aria-label="Menu mobile">
                <Link
                  to="/eventos"
                  className="px-3.5 py-3 rounded-md bg-[#080808] border border-[#292929] text-xs font-bold uppercase tracking-wider text-[#F4F4F2]"
                >
                  Eventos
                </Link>
                <Link
                  to="/bares"
                  className="px-3.5 py-3 rounded-md bg-[#080808] border border-[#292929] text-xs font-bold uppercase tracking-wider text-[#F4F4F2]"
                >
                  Bares
                </Link>
                <Link
                  to="/mapa"
                  className="px-3.5 py-3 rounded-md bg-[#080808] border border-[#292929] text-xs font-bold uppercase tracking-wider text-[#F4F4F2] flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-[#858585]" /> Mapa
                </Link>
                <Link
                  to="/bora-junto"
                  className="px-3.5 py-3 rounded-md bg-[#080808] border border-[#292929] text-xs font-bold uppercase tracking-wider text-[#F4F4F2] flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-[#858585]" /> Bora Junto
                </Link>
                <Link
                  to="/curadoria"
                  className="px-3.5 py-3 rounded-md bg-[#080808] border border-[#292929] text-xs font-bold uppercase tracking-wider text-[#F4F4F2] flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#858585]" /> Curadoria
                </Link>
                <Link
                  to="/organizador"
                  className="px-3.5 py-3 rounded-md bg-[#F4F4F2] text-xs font-bold uppercase tracking-wider text-[#080808] flex items-center justify-between"
                >
                  <span>Divulgar</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </nav>

              <div className="pt-3 border-t border-[#292929] flex items-center justify-between gap-3">
                {user ? (
                  <>
                    <Link
                      to="/perfil"
                      className="text-sm font-medium text-[#F4F4F2] flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-[#858585]" />
                      {user.displayName || user.email}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="text-xs text-[#858585] underline"
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
                    className="w-full py-2.5 rounded-md border border-[#292929] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider"
                  >
                    Entrar com Google
                  </button>
                )}
              </div>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="block px-3.5 py-2.5 rounded-md bg-[#080808] border border-[#F4F4F2]/40 text-xs font-bold uppercase tracking-wider text-[#F4F4F2]"
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
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080808]/95 backdrop-blur-sm border-t border-[#292929] grid grid-cols-5 h-14 pb-[env(safe-area-inset-bottom)]"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide ${
                isActive ? 'text-[#F4F4F2]' : 'text-[#858585]'
              }`
            }
          >
            <Home className="w-4 h-4" />
            <span>Início</span>
          </NavLink>
          <NavLink
            to="/eventos"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide ${
                isActive ? 'text-[#F4F4F2]' : 'text-[#858585]'
              }`
            }
          >
            <Calendar className="w-4 h-4" />
            <span>Eventos</span>
          </NavLink>
          <NavLink
            to="/bares"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide ${
                isActive ? 'text-[#F4F4F2]' : 'text-[#858585]'
              }`
            }
          >
            <Wine className="w-4 h-4" />
            <span>Bares</span>
          </NavLink>
          <NavLink
            to="/mapa"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide ${
                isActive ? 'text-[#F4F4F2]' : 'text-[#858585]'
              }`
            }
          >
            <MapPin className="w-4 h-4" />
            <span>Mapa</span>
          </NavLink>
          <NavLink
            to={user ? '/perfil' : '/favoritos'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide ${
                isActive ? 'text-[#F4F4F2]' : 'text-[#858585]'
              }`
            }
          >
            {user ? <UserIcon className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            <span>{user ? 'Perfil' : 'Favoritos'}</span>
          </NavLink>
        </nav>

        {/* Monochrome Footer */}
        <footer className="bg-[#080808] text-[#F4F4F2] pt-14 pb-24 lg:pb-12 border-t border-[#292929]">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#292929]">
              <div className="md:col-span-5 space-y-4">
                <Link to="/" className="inline-block">
                  <BrandWordmark size="lg" tone="on-dark" />
                </Link>
                <p className="text-sm text-[#858585] max-w-md leading-relaxed">
                  O teu próximo rolê começa aqui. Guia editorial independente para descobrir
                  festas, baladas, bares, shows e cultura urbana em Porto Alegre.
                </p>
              </div>

              <div className="md:col-span-3 space-y-3">
                <h2 className="font-label text-xs font-bold uppercase tracking-[0.12em] text-[#F4F4F2]">
                  Descobrir
                </h2>
                <ul className="space-y-2.5 text-sm text-[#858585]">
                  <li>
                    <Link to="/eventos" className="hover:text-[#F4F4F2] transition-colors">
                      Eventos em Porto Alegre
                    </Link>
                  </li>
                  <li>
                    <Link to="/bares" className="hover:text-[#F4F4F2] transition-colors">
                      Bares para conhecer
                    </Link>
                  </li>
                  <li>
                    <Link to="/mapa" className="hover:text-[#F4F4F2] transition-colors">
                      Mapa interativo
                    </Link>
                  </li>
                  <li>
                    <Link to="/bora-junto" className="hover:text-[#F4F4F2] transition-colors">
                      Bora Junto com amigos
                    </Link>
                  </li>
                  <li>
                    <Link to="/curadoria" className="hover:text-[#F4F4F2] transition-colors">
                      Curadoria inteligente
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-4 space-y-3">
                <h2 className="font-label text-xs font-bold uppercase tracking-[0.12em] text-[#F4F4F2]">
                  Cena e transparência
                </h2>
                <ul className="space-y-2.5 text-sm text-[#858585]">
                  <li>
                    <Link to="/organizador" className="hover:text-[#F4F4F2] transition-colors">
                      Divulgar meu evento
                    </Link>
                  </li>
                  <li>
                    <Link to="/sobre" className="hover:text-[#F4F4F2] transition-colors">
                      Sobre o ResenhaPOA
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacidade" className="hover:text-[#F4F4F2] transition-colors">
                      Privacidade (LGPD)
                    </Link>
                  </li>
                  <li>
                    <Link to="/termos" className="hover:text-[#F4F4F2] transition-colors">
                      Termos de uso
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/politica-de-conteudo"
                      className="hover:text-[#F4F4F2] transition-colors"
                    >
                      Política de conteúdo e classificação etária
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link
                        to="/admin"
                        className="inline-flex items-center gap-1.5 text-[#F4F4F2] hover:underline"
                      >
                        <Shield className="w-3.5 h-3.5" /> Painel Administrativo
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#858585]">
              <span>ResenhaPOA · Porto Alegre — RS</span>
              <a
                href="#top"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-[#F4F4F2] hover:underline"
              >
                Voltar ao topo ↑
              </a>
            </div>
          </div>
        </footer>

        {/* Monochrome Auth Modal */}
        {authModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-[#141414] text-[#F4F4F2] border border-[#292929] rounded-lg p-6 sm:p-8 relative shadow-2xl">
              <button
                type="button"
                onClick={closeAuthModal}
                aria-label="Fechar janela de login"
                className="absolute right-4 top-4 w-9 h-9 rounded-md flex items-center justify-center border border-[#292929] hover:border-[#F4F4F2] text-[#858585] hover:text-[#F4F4F2]"
              >
                <X className="w-4 h-4" />
              </button>

              <p className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585] mb-2">
                Conta ResenhaPOA
              </p>
              <h2
                id="auth-modal-title"
                className="font-display text-3xl font-extrabold uppercase tracking-tight mb-3"
              >
                Entre com sua conta Google
              </h2>
              <p className="text-sm text-[#858585] leading-relaxed mb-6">
                {authPromptReason ||
                  'A navegação é livre. Entre apenas para salvar favoritos, criar enquetes Bora Junto ou divulgar eventos.'}
              </p>

              {authError && (
                <div className="mb-4 p-3 rounded border border-[#F4F4F2]/40 bg-[#080808] text-xs text-[#F4F4F2]">
                  {authError}
                </div>
              )}

              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-5 bg-[#F4F4F2] hover:bg-white disabled:opacity-60 text-[#080808] font-bold text-xs uppercase tracking-wider rounded-md transition-colors"
              >
                {authLoading ? 'Conectando...' : 'Continuar com Google'}
              </button>

              <p className="mt-4 text-xs text-[#858585] leading-relaxed">
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
            className="fixed bottom-16 lg:bottom-6 right-4 sm:right-6 z-50 bg-[#F4F4F2] text-[#080808] border border-[#080808] rounded-md font-semibold text-xs px-5 py-3 shadow-xl"
          >
            {toastMsg}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};
