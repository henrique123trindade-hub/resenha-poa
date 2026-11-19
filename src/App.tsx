import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { CatalogProvider } from './contexts/CatalogContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';

const EventsPage = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })));
const EventDetailPage = lazy(() =>
  import('./pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
);
const VenuesPage = lazy(() => import('./pages/VenuesPage').then((m) => ({ default: m.VenuesPage })));
const VenueDetailPage = lazy(() =>
  import('./pages/VenueDetailPage').then((m) => ({ default: m.VenueDetailPage })),
);
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));
const BoraJuntoPage = lazy(() =>
  import('./pages/BoraJuntoPage').then((m) => ({ default: m.BoraJuntoPage })),
);
const FavoritesProfilePage = lazy(() =>
  import('./pages/FavoritesProfilePage').then((m) => ({ default: m.FavoritesProfilePage })),
);
const OrganizerPage = lazy(() =>
  import('./pages/OrganizerPage').then((m) => ({ default: m.OrganizerPage })),
);
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const CuratorPage = lazy(() =>
  import('./pages/CuratorPage').then((m) => ({ default: m.CuratorPage })),
);
const InstitutionalPage = lazy(() =>
  import('./pages/InstitutionalPage').then((m) => ({ default: m.InstitutionalPage })),
);

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <CatalogProvider>
          <BrowserRouter>
            {mapsQuotaExceeded && (
              <div
                role="alert"
                className="bg-[#141414] border-b border-[#292929] text-[#F4F4F2] px-4 py-2.5 text-xs flex items-center justify-between gap-3"
              >
                <span>
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 text-[#F4F4F2]" />
                  A cota demonstrativa da API do Google Maps foi atingida neste momento. Você pode
                  continuar usando a lista georreferenciada ou configurar sua própria chave:{' '}
                  <a
                    href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold text-[#F4F4F2]"
                  >
                    Ver instruções
                  </a>
                  .
                </span>
                <button
                  type="button"
                  onClick={() => setMapsQuotaExceeded(false)}
                  aria-label="Dispensar aviso do mapa"
                  className="text-[#858585] hover:text-[#F4F4F2] shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <Layout>
              <Suspense
                fallback={
                  <div className="min-h-[60vh] bg-[#080808] text-[#858585] flex items-center justify-center text-xs uppercase tracking-widest">
                    Carregando...
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/eventos" element={<EventsPage />} />
                  <Route path="/eventos/:slug" element={<EventDetailPage />} />
                  <Route path="/bares" element={<VenuesPage />} />
                  <Route path="/bares/:slug" element={<VenueDetailPage />} />
                  <Route path="/mapa" element={<MapPage />} />
                  <Route path="/bora-junto" element={<BoraJuntoPage />} />
                  <Route path="/bora-junto/:listId" element={<BoraJuntoPage />} />
                  <Route path="/favoritos" element={<FavoritesProfilePage mode="favorites" />} />
                  <Route path="/perfil" element={<FavoritesProfilePage mode="profile" />} />
                  <Route path="/organizador" element={<OrganizerPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/curadoria" element={<CuratorPage />} />
                  <Route path="/sobre" element={<InstitutionalPage topic="sobre" />} />
                  <Route path="/privacidade" element={<InstitutionalPage topic="privacidade" />} />
                  <Route path="/termos" element={<InstitutionalPage topic="termos" />} />
                  <Route
                    path="/politica-de-conteudo"
                    element={<InstitutionalPage topic="politica" />}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Layout>
          </BrowserRouter>
        </CatalogProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
