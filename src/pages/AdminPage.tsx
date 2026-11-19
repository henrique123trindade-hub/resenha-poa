import React, { useEffect, useState } from 'react';
import {
  Archive,
  Check,
  FileSpreadsheet,
  Flag,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createEventInFirestore,
  createVenueInFirestore,
  deleteEventAsAdmin,
  fetchAllAdminData,
  moderateReviewAsAdmin,
  resolveReportAsAdmin,
  updateEventAsAdmin,
  upsertCategoryAsAdmin,
  upsertNeighborhoodAsAdmin,
  verifyOrganizerAsAdmin,
} from '../services/firestoreService';
import type {
  CategoryMeta,
  EventItem,
  NeighborhoodMeta,
  OrganizerProfile,
  ReportItem,
  VenueItem,
  VenueReviewItem,
} from '../types/resenha';
import { detectDuplicateEvent, parseEventsCsv } from '../utils/eventFilters';
import { isEventPast } from '../utils/datePoa';
import { useToast } from '../components/Layout';

type AdminTab = 'queue' | 'csv' | 'venues' | 'taxonomy' | 'moderation';

export const AdminPage: React.FC = () => {
  const { user, isAdmin, openAuthModal } = useAuth();
  const { notify } = useToast();

  const [tab, setTab] = useState<AdminTab>('queue');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [reviews, setReviews] = useState<VenueReviewItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [categories, setCategories] = useState<CategoryMeta[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodMeta[]>([]);

  // CSV Import state
  const [csvText, setCsvText] = useState(
    'title,category,dateISO,startTime,neighborhood,venueName,address,priceType,priceMin,ageRating,sourceName\n',
  );
  const [csvPreview, setCsvPreview] = useState<ReturnType<typeof parseEventsCsv> | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  // Venue Form state
  const [vName, setVName] = useState('');
  const [vCategory, setVCategory] = useState('Bar & Música');
  const [vEnv, setVEnv] = useState('Mesas na calçada e salão');
  const [vNeighborhood, setVNeighborhood] = useState('Cidade Baixa');
  const [vAddress, setVAddress] = useState('');
  const [vPriceRange, setVPriceRange] = useState<'$' | '$$' | '$$$' | 'Não informado'>('$$');
  const [vHoursSummary, setVHoursSummary] = useState('');
  const [vHoursVerified, setVHoursVerified] = useState(false);
  const [vDesc, setVDesc] = useState('');
  const [vSource, setVSource] = useState('Cadastro editorial ResenhaPOA');

  // Category / Neighborhood Admin Forms
  const [catLabel, setCatLabel] = useState('');
  const [catTagline, setCatTagline] = useState('');
  const [neiName, setNeiName] = useState('');
  const [neiVibe, setNeiVibe] = useState('');
  const [neiSummary, setNeiSummary] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const bundle = await fetchAllAdminData();
      setEvents(bundle.events);
      setVenues(bundle.venues);
      setReviews(bundle.reviews);
      setReports(bundle.reports);
      setOrganizers(bundle.organizers);
      setUsersCount(bundle.usersCount);
      setCategories(bundle.categories);
      setNeighborhoods(bundle.neighborhoods);
    } catch {
      notify('Erro ao carregar dados administrativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  if (!user) {
    return (
      <div className="max-w-[780px] mx-auto px-4 py-20 text-center space-y-5 text-[#F4F4F2]">
        <Shield className="w-10 h-10 text-[#F4F4F2] mx-auto" />
        <h1 className="font-display text-4xl font-extrabold italic uppercase tracking-tight">
          Painel Administrativo
        </h1>
        <p className="text-sm text-[#858585]">
          Faça login com a conta autorizada para acessar moderação e gestão do catálogo.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('Entre com a conta administrativa autorizada.')}
          className="px-6 py-3 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Entrar com Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-[780px] mx-auto px-4 py-20 text-center space-y-4 text-[#F4F4F2]">
        <Shield className="w-10 h-10 text-red-400 mx-auto" />
        <h1 className="font-display text-4xl font-extrabold italic uppercase tracking-tight">
          Acesso restrito
        </h1>
        <p className="text-sm text-[#858585]">
          A conta <strong className="text-[#F4F4F2]">{user.email}</strong> não possui permissão de
          administração.
        </p>
      </div>
    );
  }

  const pendingEvents = events.filter((e) => e.status === 'pending');
  const publishedEvents = events.filter((e) => e.status === 'published');
  const openReports = reports.filter((r) => r.status === 'open');
  const pendingReviews = reviews.filter((r) => r.status === 'pending');

  const handleEventPatch = async (ev: EventItem, updates: Partial<EventItem>, msg: string) => {
    try {
      await updateEventAsAdmin(ev.id, updates);
      notify(msg);
      await loadData();
    } catch {
      notify('Não foi possível atualizar o evento.');
    }
  };

  const handleArchiveExpired = async () => {
    const expired = publishedEvents.filter((e) => isEventPast(e.dateISO, e.endTime));
    if (expired.length === 0) {
      notify('Nenhum evento publicado expirado encontrado.');
      return;
    }
    try {
      await Promise.all(
        expired.map((e) => updateEventAsAdmin(e.id, { status: 'ended' })),
      );
      notify(`${expired.length} evento(s) expirado(s) marcado(s) como encerrado.`);
      await loadData();
    } catch {
      notify('Erro ao arquivar eventos expirados.');
    }
  };

  const handleParseCsv = () => {
    const parsed = parseEventsCsv(csvText);
    setCsvPreview(parsed);
  };

  const handleImportCsvRows = async () => {
    if (!csvPreview || csvPreview.validRows.length === 0) return;
    setImportingCsv(true);
    let imported = 0;
    let skippedDup = 0;

    try {
      for (const row of csvPreview.validRows) {
        const dup = detectDuplicateEvent(
          {
            title: row.title,
            dateISO: row.dateISO,
            neighborhood: row.neighborhood,
            venueName: row.venueName,
          },
          events,
        );
        if (dup) {
          skippedDup++;
          continue;
        }
        await createEventInFirestore(
          {
            ...row,
            isVerified: true,
            isDemoExample: false,
            isSponsored: false,
            isFeatured: false,
            status: 'published',
            organizerId: user.uid,
            organizerName: 'Curadoria ResenhaPOA',
            lastVerifiedAt: new Date().toISOString().slice(0, 10),
          },
          { isAdmin: true },
        );
        imported++;
      }
      notify(
        `Importação concluída: ${imported} publicado(s), ${skippedDup} duplicata(s) ignorada(s).`,
      );
      setCsvPreview(null);
      await loadData();
    } catch {
      notify('Erro durante importação CSV.');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vName.trim().length < 2 || vAddress.trim().length < 4 || vDesc.trim().length < 10) {
      notify('Preencha nome, endereço e descrição do bar.');
      return;
    }
    try {
      await createVenueInFirestore({
        name: vName,
        category: vCategory,
        environmentType: vEnv,
        neighborhood: vNeighborhood,
        address: vAddress,
        priceRange: vPriceRange,
        hoursSummary: vHoursSummary || undefined,
        hoursVerified: vHoursVerified,
        description: vDesc,
        sourceName: vSource,
        lastVerifiedAt: new Date().toISOString().slice(0, 10),
        isDemoExample: false,
        status: 'published',
      });
      notify(`Estabelecimento "${vName}" publicado.`);
      setVName('');
      setVAddress('');
      setVDesc('');
      await loadData();
    } catch {
      notify('Erro ao criar estabelecimento.');
    }
  };

  const fieldClass =
    'w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-sm text-[#F4F4F2] focus:outline-none';

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 text-[#F4F4F2]">
      <div className="pb-6 border-b border-[#292929] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858585] mb-2">
            Consola de curadoria & moderação
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
            Administração ResenhaPOA
          </h1>
        </div>
        <button
          type="button"
          onClick={handleArchiveExpired}
          className="px-5 py-2.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 self-start lg:self-auto transition-colors"
        >
          <Archive className="w-4 h-4" />
          <span>Encerrar eventos passados</span>
        </button>
      </div>

      {/* Real Firestore Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Eventos na fila', value: pendingEvents.length },
          { label: 'Eventos publicados', value: publishedEvents.length },
          { label: 'Bares no banco', value: venues.length },
          { label: 'Denúncias abertas', value: openReports.length },
          { label: 'Avaliações pendentes', value: pendingReviews.length },
          { label: 'Contas registradas', value: usersCount },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-[#141414] border border-[#292929] rounded-md p-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#858585]">
              {metric.label}
            </p>
            <p className="font-display text-3xl font-extrabold mt-1 tabular-nums text-[#F4F4F2]">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#292929] pb-4">
        {(
          [
            { id: 'queue', label: `Eventos (${events.length})` },
            { id: 'csv', label: 'Importar CSV' },
            { id: 'venues', label: `Bares (${venues.length})` },
            { id: 'taxonomy', label: 'Categorias & Bairros' },
            { id: 'moderation', label: `Moderação (${pendingReviews.length + openReports.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-colors ${
              tab === t.id
                ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                : 'bg-[#141414] border-[#292929] text-[#F4F4F2] hover:border-[#F4F4F2]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#858585]">Carregando registros do Firestore...</p>
      ) : (
        <>
          {/* TAB 1: EVENT QUEUE & MANAGEMENT */}
          {tab === 'queue' && (
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="bg-[#141414] border border-[#292929] rounded-md p-8 text-sm text-[#858585]">
                  Nenhum evento gravado no Firestore ainda.
                </div>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-[#141414] border border-[#292929] rounded-md p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-[#F4F4F2]">{ev.status}</span>
                        <span className="text-[#858585]">·</span>
                        <span className="tabular-nums text-[#858585]">
                          {ev.dateISO} {ev.startTime}
                        </span>
                        <span className="text-[#858585]">·</span>
                        <span className="text-[#858585]">{ev.neighborhood}</span>
                        {ev.isVerified && <span className="text-[#F4F4F2]">· Verificado</span>}
                        {ev.isSponsored && <span className="text-[#858585]">· Patrocinado</span>}
                      </div>
                      <h3 className="font-display text-2xl font-bold uppercase text-[#F4F4F2]">
                        {ev.title}
                      </h3>
                      <p className="text-xs text-[#858585]">
                        {ev.venueName} · Org: {ev.organizerName} · Fonte: {ev.sourceName}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ev.status !== 'published' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleEventPatch(
                              ev,
                              {
                                status: 'published',
                                lastVerifiedAt: new Date().toISOString().slice(0, 10),
                              },
                              'Evento aprovado e publicado.',
                            )
                          }
                          className="px-3.5 py-2 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Publicar
                        </button>
                      )}
                      {ev.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleEventPatch(ev, { status: 'rejected' }, 'Evento recusado.')
                          }
                          className="px-3.5 py-2 rounded-md border border-red-400/50 text-red-400 hover:bg-red-950/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Recusar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleEventPatch(
                            ev,
                            { isVerified: !ev.isVerified },
                            ev.isVerified ? 'Selo removido.' : 'Evento marcado como verificado.',
                          )
                        }
                        className="px-3.5 py-2 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-xs font-bold uppercase tracking-wider text-[#F4F4F2] inline-flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {ev.isVerified ? 'Remover verificado' : 'Verificar'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleEventPatch(
                            ev,
                            { isFeatured: !ev.isFeatured },
                            ev.isFeatured ? 'Removido dos destaques.' : 'Marcado em destaque.',
                          )
                        }
                        className="px-3.5 py-2 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-xs font-bold uppercase tracking-wider text-[#F4F4F2] inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {ev.isFeatured ? 'Tirar destaque' : 'Destacar'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleEventPatch(
                            ev,
                            { isSponsored: !ev.isSponsored },
                            ev.isSponsored ? 'Tag patrocinado removida.' : 'Marcado patrocinado.',
                          )
                        }
                        className="px-3.5 py-2 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-xs font-bold uppercase tracking-wider text-[#F4F4F2]"
                      >
                        {ev.isSponsored ? 'Remover patrocinado' : 'Patrocinado'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteEventAsAdmin(ev.id);
                          notify('Evento excluído.');
                          await loadData();
                        }}
                        aria-label={`Excluir ${ev.title}`}
                        className="px-3 py-2 rounded-md border border-red-400/50 text-red-400 hover:bg-red-950/30 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: CSV IMPORT WITH DUPLICATE DETECTION */}
          {tab === 'csv' && (
            <div className="bg-[#141414] border border-[#292929] rounded-md p-6 space-y-5">
              <div className="flex items-center gap-2 text-[#F4F4F2]">
                <FileSpreadsheet className="w-5 h-5" />
                <h2 className="font-display text-2xl font-extrabold italic uppercase">
                  Importação em lote via CSV
                </h2>
              </div>
              <p className="text-xs text-[#858585]">
                Colunas obrigatórias:{' '}
                <code className="bg-[#080808] px-1.5 py-0.5 rounded text-[#F4F4F2]">
                  title,category,dateISO,startTime,neighborhood,venueName,address
                </code>
                . Opcionais:{' '}
                <code className="bg-[#080808] px-1.5 py-0.5 rounded text-[#F4F4F2]">
                  priceType,priceMin,ageRating,sourceName,ticketUrl,description
                </code>
                .
              </p>

              <textarea
                rows={7}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-3.5 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md font-mono text-xs text-[#F4F4F2] focus:outline-none"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleParseCsv}
                  className="px-5 py-2.5 rounded-md border border-[#292929] hover:border-[#F4F4F2] bg-[#080808] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Validar CSV
                </button>
                {csvPreview && csvPreview.validRows.length > 0 && (
                  <button
                    type="button"
                    disabled={importingCsv}
                    onClick={handleImportCsvRows}
                    className="px-5 py-2.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    {importingCsv
                      ? 'Importando...'
                      : `Publicar ${csvPreview.validRows.length} evento(s) válidos`}
                  </button>
                )}
              </div>

              {csvPreview && (
                <div className="space-y-3 pt-3 border-t border-[#292929] text-xs">
                  <p className="text-[#F4F4F2] font-bold">
                    Linhas válidas prontas: {csvPreview.validRows.length}
                  </p>
                  {csvPreview.errors.length > 0 && (
                    <div className="p-3 rounded-md bg-[#080808] border border-red-400/50 space-y-1 text-red-300">
                      {csvPreview.errors.map((err, i) => (
                        <p key={i}>
                          Linha {err.row}: {err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VENUES */}
          {tab === 'venues' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleCreateVenue}
                className="lg:col-span-5 bg-[#141414] border border-[#292929] rounded-md p-6 space-y-4 h-fit"
              >
                <h2 className="font-display text-2xl font-extrabold italic uppercase flex items-center gap-2 text-[#F4F4F2]">
                  <Plus className="w-4 h-4" /> Cadastrar bar / espaço
                </h2>
                <input
                  type="text"
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="Nome do bar *"
                  className={fieldClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={vCategory}
                    onChange={(e) => setVCategory(e.target.value)}
                    placeholder="Categoria"
                    className={fieldClass}
                  />
                  <input
                    type="text"
                    value={vNeighborhood}
                    onChange={(e) => setVNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    className={fieldClass}
                  />
                </div>
                <input
                  type="text"
                  value={vEnv}
                  onChange={(e) => setVEnv(e.target.value)}
                  placeholder="Tipo de ambiente"
                  className={fieldClass}
                />
                <input
                  type="text"
                  value={vAddress}
                  onChange={(e) => setVAddress(e.target.value)}
                  placeholder="Endereço completo *"
                  className={fieldClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={vPriceRange}
                    onChange={(e) =>
                      setVPriceRange(e.target.value as '$' | '$$' | '$$$' | 'Não informado')
                    }
                    className={fieldClass}
                  >
                    <option value="$">$ (Econômico)</option>
                    <option value="$$">$$ (Moderado)</option>
                    <option value="$$$">$$$ (Autoral)</option>
                    <option value="Não informado">Não informado</option>
                  </select>
                  <input
                    type="text"
                    value={vSource}
                    onChange={(e) => setVSource(e.target.value)}
                    placeholder="Fonte dos dados"
                    className={fieldClass}
                  />
                </div>
                <input
                  type="text"
                  value={vHoursSummary}
                  onChange={(e) => setVHoursSummary(e.target.value)}
                  placeholder="Resumo de horários (opcional)"
                  className={fieldClass}
                />
                <label className="flex items-center gap-2 text-xs text-[#858585]">
                  <input
                    type="checkbox"
                    checked={vHoursVerified}
                    onChange={(e) => setVHoursVerified(e.target.checked)}
                  />
                  Horários oficialmente verificados
                </label>
                <textarea
                  rows={3}
                  value={vDesc}
                  onChange={(e) => setVDesc(e.target.value)}
                  placeholder="Descrição editorial *"
                  className="w-full p-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-sm text-[#F4F4F2] focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Publicar estabelecimento
                </button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                {venues.map((v) => (
                  <div
                    key={v.id}
                    className="bg-[#141414] border border-[#292929] rounded-md p-4"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#858585]">
                      {v.neighborhood} · {v.category} · {v.priceRange}
                    </p>
                    <p className="font-display text-xl font-bold uppercase text-[#F4F4F2]">{v.name}</p>
                    <p className="text-xs text-[#858585]">{v.address}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TAXONOMY (CATEGORIES & NEIGHBORHOODS) */}
          {tab === 'taxonomy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#141414] border border-[#292929] rounded-md p-6 space-y-4">
                <h2 className="font-display text-2xl font-extrabold italic uppercase text-[#F4F4F2]">
                  Gerenciar categorias
                </h2>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={catLabel}
                    onChange={(e) => setCatLabel(e.target.value)}
                    placeholder="Nome da categoria"
                    className={fieldClass}
                  />
                  <input
                    type="text"
                    value={catTagline}
                    onChange={(e) => setCatTagline(e.target.value)}
                    placeholder="Descrição curta"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!catLabel.trim()) return;
                      await upsertCategoryAsAdmin({
                        id: catLabel,
                        label: catLabel,
                        tagline: catTagline,
                        active: true,
                      });
                      setCatLabel('');
                      setCatTagline('');
                      notify('Categoria salva no Firestore.');
                      await loadData();
                    }}
                    className="px-5 py-2.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Salvar categoria
                  </button>
                </div>
                <div className="pt-3 border-t border-[#292929] space-y-2 text-xs">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-[#F4F4F2]">
                      <span className="font-medium">{c.label}</span>
                      <span className="text-[#858585]">{c.active ? 'Ativa' : 'Oculta'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#141414] border border-[#292929] rounded-md p-6 space-y-4">
                <h2 className="font-display text-2xl font-extrabold italic uppercase text-[#F4F4F2]">
                  Gerenciar bairros
                </h2>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={neiName}
                    onChange={(e) => setNeiName(e.target.value)}
                    placeholder="Nome do bairro"
                    className={fieldClass}
                  />
                  <input
                    type="text"
                    value={neiVibe}
                    onChange={(e) => setNeiVibe(e.target.value)}
                    placeholder="Tag de perfil do bairro"
                    className={fieldClass}
                  />
                  <textarea
                    rows={2}
                    value={neiSummary}
                    onChange={(e) => setNeiSummary(e.target.value)}
                    placeholder="Resumo editorial"
                    className="w-full p-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-sm text-[#F4F4F2] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!neiName.trim() || !neiSummary.trim()) return;
                      await upsertNeighborhoodAsAdmin({
                        id: neiName,
                        name: neiName,
                        vibeTag: neiVibe,
                        editorialSummary: neiSummary,
                        active: true,
                      });
                      setNeiName('');
                      setNeiVibe('');
                      setNeiSummary('');
                      notify('Bairro salvo no Firestore.');
                      await loadData();
                    }}
                    className="px-5 py-2.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Salvar bairro
                  </button>
                </div>
                <div className="pt-3 border-t border-[#292929] space-y-2 text-xs">
                  {neighborhoods.map((n) => (
                    <div key={n.id} className="flex items-center justify-between text-[#F4F4F2]">
                      <span className="font-medium">{n.name}</span>
                      <span className="text-[#858585]">{n.active ? 'Ativo' : 'Oculto'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REVIEWS, REPORTS & ORGANIZERS MODERATION */}
          {tab === 'moderation' && (
            <div className="space-y-8">
              <div className="space-y-3">
                <h2 className="font-display text-2xl font-extrabold italic uppercase flex items-center gap-2 text-[#F4F4F2]">
                  <Flag className="w-5 h-5 text-red-400" /> Denúncias e avisos ({reports.length})
                </h2>
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="bg-[#141414] border border-[#292929] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                        {r.targetType} · {r.targetId} · Status: {r.status}
                      </p>
                      <p className="text-sm text-[#F4F4F2] mt-1">{r.reason}</p>
                    </div>
                    {r.status === 'open' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await resolveReportAsAdmin(r.id, 'resolved');
                            notify('Denúncia marcada como resolvida.');
                            await loadData();
                          }}
                          className="px-3.5 py-1.5 rounded-md bg-[#F4F4F2] text-[#080808] text-xs font-bold uppercase tracking-wider"
                        >
                          Resolver
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await resolveReportAsAdmin(r.id, 'dismissed');
                            notify('Denúncia arquivada.');
                            await loadData();
                          }}
                          className="px-3.5 py-1.5 rounded-md border border-[#292929] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider"
                        >
                          Arquivar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h2 className="font-display text-2xl font-extrabold italic uppercase text-[#F4F4F2]">
                  Avaliações de bares ({reviews.length})
                </h2>
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-[#141414] border border-[#292929] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#F4F4F2]">
                        {rev.authorName} · Nota {rev.rating}/5 · Status: {rev.status}
                      </p>
                      <p className="text-sm text-[#858585] mt-1">{rev.comment}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await moderateReviewAsAdmin(rev.id, 'approved');
                          notify('Avaliação aprovada.');
                          await loadData();
                        }}
                        className="px-3.5 py-1.5 rounded-md bg-[#F4F4F2] text-[#080808] text-xs font-bold uppercase tracking-wider"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await moderateReviewAsAdmin(rev.id, 'rejected');
                          notify('Avaliação rejeitada.');
                          await loadData();
                        }}
                        className="px-3.5 py-1.5 rounded-md border border-red-400/50 text-red-400 text-xs font-bold uppercase tracking-wider"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h2 className="font-display text-2xl font-extrabold italic uppercase text-[#F4F4F2]">
                  Organizadores cadastrados ({organizers.length})
                </h2>
                {organizers.map((org) => (
                  <div
                    key={org.ownerId}
                    className="bg-[#141414] border border-[#292929] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-display font-bold uppercase text-lg text-[#F4F4F2]">
                        {org.orgName}
                      </p>
                      <p className="text-xs text-[#858585]">
                        {org.contactEmail} {org.instagram ? `· ${org.instagram}` : ''} · Status:{' '}
                        {org.verificationStatus}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await verifyOrganizerAsAdmin(org.ownerId, 'verified');
                          notify('Organizador verificado.');
                          await loadData();
                        }}
                        className="px-3.5 py-1.5 rounded-md bg-[#F4F4F2] text-[#080808] text-xs font-bold uppercase tracking-wider"
                      >
                        Verificar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await verifyOrganizerAsAdmin(org.ownerId, 'rejected');
                          notify('Organizador recusado.');
                          await loadData();
                        }}
                        className="px-3.5 py-1.5 rounded-md border border-red-400/50 text-red-400 text-xs font-bold uppercase tracking-wider"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
