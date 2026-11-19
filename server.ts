import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health & public client configuration (Google Maps browser key only)
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, city: 'Porto Alegre - RS', timezone: 'America/Sao_Paulo' });
  });

  app.get('/api/maps-config', (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    res.json({
      configured: Boolean(apiKey && apiKey !== 'MY_GOOGLE_MAPS_API_KEY'),
      apiKey: apiKey && apiKey !== 'MY_GOOGLE_MAPS_API_KEY' ? apiKey : '',
    });
  });

  // 1. Low-latency search intent interpreter (gemini-3.1-flash-lite)
  app.post('/api/ai/quick-suggest', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim().slice(0, 200) : '';
    if (!query) {
      return res.status(400).json({ error: 'Informe o que você procura para buscar em Porto Alegre.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chave Gemini não configurada no servidor. Verifique GEMINI_API_KEY em Settings > Secrets.',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Interprete a busca de rolê em Porto Alegre: "${query}". Retorne filtros compatíveis com o catálogo.`,
        config: {
          systemInstruction:
            'Você é um assistente rápido do ResenhaPOA. Mapeie a intenção do usuário para filtros de Porto Alegre sem inventar eventos.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description:
                  'Um de: todos, funk, eletronica, pagode-samba, sertanejo, rock-indie, hip-hop, pop, bares, shows, cultura, gratuitos',
              },
              neighborhood: {
                type: Type.STRING,
                description:
                  'Um de: todos, Cidade Baixa, Moinhos de Vento, Bom Fim, Quarto Distrito, Centro Histórico, Orla do Guaíba',
              },
              quickDate: {
                type: Type.STRING,
                description: 'Um de: all, today, tomorrow, weekend, friday, saturday, sunday',
              },
              onlyFree: {
                type: Type.BOOLEAN,
              },
              summary: {
                type: Type.STRING,
                description: 'Resumo curto em português brasileiro natural (máx 120 caracteres).',
              },
            },
            required: ['category', 'neighborhood', 'quickDate', 'onlyFree', 'summary'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json(parsed);
    } catch (error) {
      console.error('Erro em /api/ai/quick-suggest:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha na sugestão rápida.',
      });
    }
  });

  // 2. Live Porto Alegre cultural discovery with Google Search Grounding (gemini-4-hydrogen)
  app.post('/api/ai/discover-search', async (req, res) => {
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim().slice(0, 240) : '';
    if (!topic) {
      return res.status(400).json({ error: 'Informe um tema, bairro ou data para pesquisar.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chave Gemini não configurada no servidor. Verifique GEMINI_API_KEY em Settings > Secrets.',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Pesquise informações públicas e recentes sobre programação cultural, shows, bares ou eventos em Porto Alegre (RS) relacionados a: "${topic}". Responda em português brasileiro direto e transparente. Indique claramente quando preços ou horários não estiverem confirmados nas fontes encontradas.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = rawChunks
        .map((chunk) => chunk.web)
        .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
        .map((web) => ({ uri: web.uri, title: web.title || web.uri }));

      return res.json({
        text: response.text ?? 'Nenhuma informação pública encontrada para essa consulta.',
        sources,
      });
    } catch (error) {
      console.error('Erro em /api/ai/discover-search:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha na pesquisa com Google Search.',
      });
    }
  });

  // 3. Place discovery in Porto Alegre with Google Maps Grounding (gemini-4-hydrogen)
  app.post('/api/ai/discover-places', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim().slice(0, 240) : '';
    const lat = typeof req.body?.lat === 'number' ? req.body.lat : -30.0346;
    const lng = typeof req.body?.lng === 'number' ? req.body.lng : -51.2177;

    if (!query) {
      return res.status(400).json({ error: 'Descreva que tipo de lugar ou bar você procura em Porto Alegre.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chave Gemini não configurada no servidor. Verifique GEMINI_API_KEY em Settings > Secrets.',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Indique lugares reais em Porto Alegre (RS) para: "${query}". Informe bairro, endereço aproximado e destaque que horários e valores devem ser confirmados no local.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng,
              },
            },
          },
        },
      });

      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const places = rawChunks
        .map((chunk) => chunk.maps)
        .filter((m): m is NonNullable<typeof m> => Boolean(m && (m.uri || m.title)))
        .map((m) => ({
          title: m.title || 'Ver no Google Maps',
          uri: m.uri || '',
          reviewUris:
            m.placeAnswerSources?.reviewSnippets
              ?.map((s) => (s as { googleMapsUri?: string; uri?: string }).googleMapsUri ?? (s as { uri?: string }).uri)
              .filter((u): u is string => Boolean(u)) ?? [],
        }));

      return res.json({
        text: response.text ?? 'Nenhum local encontrado no momento.',
        places,
      });
    } catch (error) {
      console.error('Erro em /api/ai/discover-places:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao consultar lugares no Google Maps.',
      });
    }
  });

  // 4. Deep-reasoning night/weekend itinerary planner (gemini-4-hydrogen + ThinkingLevel.HIGH)
  app.post('/api/ai/plan-roteiro', async (req, res) => {
    const mood = typeof req.body?.mood === 'string' ? req.body.mood.trim().slice(0, 240) : '';
    const neighborhood = typeof req.body?.neighborhood === 'string' ? req.body.neighborhood.trim().slice(0, 80) : '';
    const budget = typeof req.body?.budget === 'string' ? req.body.budget.trim().slice(0, 60) : '';
    const ageGroup = typeof req.body?.ageGroup === 'string' ? req.body.ageGroup.trim().slice(0, 20) : '18+';
    const catalogContext = Array.isArray(req.body?.catalogContext)
      ? req.body.catalogContext.slice(0, 12)
      : [];

    if (!mood) {
      return res.status(400).json({ error: 'Conte qual é a vibe do rolê que você quer montar.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chave Gemini não configurada no servidor. Verifique GEMINI_API_KEY em Settings > Secrets.',
      });
    }

    const ageRule =
      ageGroup === 'menor'
        ? 'REGRA ESTRITA DE SEGURANÇA: O usuário informou que há menores de 18 anos no grupo. NÃO recomende eventos 18+, baladas adultas ou consumo de álcool. Sugira apenas programação Livre ou 16+ cultural/ao ar livre.'
        : 'Respeite a classificação etária de cada local informado.';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Monte um roteiro estruturado em Porto Alegre para:
- Vibe/Objetivo: ${mood}
- Bairro preferido: ${neighborhood || 'Aberto pela cidade'}
- Orçamento: ${budget || 'Flexível'}
- Faixa etária do grupo: ${ageGroup}

${ageRule}

Itens disponíveis atualmente no catálogo (observe que itens com isDemoExample=true são exemplos ilustrativos e devem ser identificados como exemplo se citados):
${JSON.stringify(catalogContext, null, 2)}

Entregue um roteiro em 3 momentos (Esquenta / Rolê Principal / Depois ou Alternativa), com dicas reais de deslocamento entre bairros de Porto Alegre e lembrete de verificar horários oficiais antes de sair.`,
        config: {
          systemInstruction:
            'Você é o curador editorial do ResenhaPOA. Escreva em português brasileiro natural de Porto Alegre, sem exagerar em gírias, sem inventar eventos reais ou preços falsos, e respeitando classificação etária.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      return res.json({
        plan: response.text ?? 'Não foi possível gerar um roteiro no momento.',
      });
    } catch (error) {
      console.error('Erro em /api/ai/plan-roteiro:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Falha ao montar roteiro inteligente.',
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else if (/\.(webp|avif|png|jpg|jpeg|js|css|woff2)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build não encontrado. Execute npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ResenhaPOA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Erro ao iniciar servidor ResenhaPOA:', err);
  process.exit(1);
});
