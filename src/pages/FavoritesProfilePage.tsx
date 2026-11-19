import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, LogOut, Shield, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCatalog } from '../contexts/CatalogContext';
import { EventCard } from '../components/EventCard';
import { VenueCard } from '../components/VenueCard';
import { fetchUserPollLists } from '../services/firestoreService';
import type { PollListItem } from '../types/resenha';
import { useToast } from '../components/Layout';

export const FavoritesProfilePage: React.FC<{ mode: 'favorites' | 'profile' }> = ({ mode }) => {
  const {
    user,
    profile,
    favorites,
    isAdmin,
    openAuthModal,
    logout,
    updatePreferences,
  } = useAuth();
  const { events, venues, categories, neighborhoods } = useCatalog();
  const { notify } = useToast();

  const [prefCats, setPrefCats] = useState<string[]>(profile?.favoriteCategories || []);
  const [prefNeighs, setPrefNeighs] = useState<string[]>(profile?.favoriteNeighborhoods || []);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [myPolls, setMyPolls] = useState<PollListItem[]>([]);

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

  if (!user) {
    return (
      <div className="max-w-[780px] mx-auto px-4 py-20 text-center space-y-5 text-[#F4F4F2]">
        <Bookmark className="w-10 h-10 text-[#F4F4F2] mx-auto" />
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          {mode === 'favorites' ? 'Seus rolês salvos' : 'Sua conta ResenhaPOA'}
        </h1>
        <p className="text-sm sm:text-base text-[#858585] max-w-md mx-auto leading-relaxed">
          Entre com sua conta Google para manter eventos e bares salvos entre dispositivos, definir
          seus bairros preferidos e acompanhar suas listas Bora Junto.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('Entre com sua conta Google para acessar seus favoritos e perfil.')}
          className="px-6 py-3.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Entrar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12 text-[#F4F4F2]">
      {/* Header */}
      <div className="bg-[#141414] border border-[#292929] rounded-md p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Avatar'}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover border border-[#292929]"
            />
          ) : null}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585]">
              Conta verificada Google
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight">
              {profile?.displayName || user.displayName || 'Explorador POA'}
            </h1>
            <p className="text-xs text-[#858585]">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
            >
              <Shield className="w-4 h-4" /> Painel Admin
            </Link>
          )}
          <Link
            to="/organizador"
            className="px-4 py-2.5 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Área do Organizador
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="px-4 py-2.5 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-xs font-bold uppercase tracking-wider text-[#858585] hover:text-[#F4F4F2] inline-flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      {/* Saved Events & Bars */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#292929] pb-4">
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight">
            Rolês e bares salvos ({favorites.length})
          </h2>
          <Link to="/eventos" className="text-xs font-bold uppercase tracking-wider text-[#F4F4F2] hover:underline">
            Explorar mais →
          </Link>
        </div>

        {savedEvents.length === 0 && savedVenues.length === 0 ? (
          <div className="bg-[#141414] border border-[#292929] rounded-md p-8 text-center space-y-3">
            <p className="text-sm text-[#858585]">
              Você ainda não salvou eventos ou bares. Clique no marcador em qualquer card para guardar aqui.
            </p>
            <Link
              to="/eventos"
              className="inline-block px-5 py-2.5 rounded-md bg-[#F4F4F2] text-[#080808] text-xs font-bold uppercase tracking-wider"
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
        <div className="flex items-center justify-between border-b border-[#292929] pb-4">
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" /> Minhas listas Bora Junto
          </h2>
          <Link to="/bora-junto" className="text-xs font-bold uppercase tracking-wider text-[#F4F4F2] hover:underline">
            + Nova lista
          </Link>
        </div>
        {myPolls.length === 0 ? (
          <p className="text-sm text-[#858585]">Você ainda não criou listas compartilhadas.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myPolls.map((p) => (
              <Link
                key={p.id}
                to={`/bora-junto/${p.id}`}
                className="p-5 rounded-md bg-[#141414] border border-[#292929] hover:border-[#F4F4F2] space-y-2 transition-colors"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                  {p.isOpen ? 'Aberta' : 'Encerrada'} · {p.options.length} opções
                </p>
                <p className="font-display text-xl font-bold uppercase text-[#F4F4F2]">{p.title}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="bg-[#141414] border border-[#292929] rounded-md p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight">
            Suas preferências em POA
          </h2>
          <p className="text-xs text-[#858585] mt-1">
            Escolha os estilos musicais e regiões que você mais curte frequentar.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F4F4F2] mb-2">
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
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                        : 'bg-[#080808] border-[#292929] text-[#F4F4F2] hover:border-[#F4F4F2]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F4F4F2] mb-2">
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
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                        : 'bg-[#080808] border-[#292929] text-[#F4F4F2] hover:border-[#F4F4F2]'
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
          className="px-6 py-3 rounded-md bg-[#F4F4F2] hover:bg-white disabled:opacity-60 text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
        >
          {savingPrefs ? 'Salvando...' : 'Salvar preferências'}
        </button>
      </section>
    </div>
  );
};
