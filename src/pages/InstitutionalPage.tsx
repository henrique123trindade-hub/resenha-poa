import React from 'react';
import { Link } from 'react-router-dom';

type DocTopic = 'sobre' | 'privacidade' | 'termos' | 'politica';

export const InstitutionalPage: React.FC<{ topic: DocTopic }> = ({ topic }) => {
  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8 text-[#F4F4F2]">
      <div className="pb-6 border-b border-[#292929]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858585] mb-2">
          ResenhaPOA · Institucional
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          {topic === 'sobre' && 'Sobre o ResenhaPOA'}
          {topic === 'privacidade' && 'Política de Privacidade (LGPD)'}
          {topic === 'termos' && 'Termos de Uso'}
          {topic === 'politica' && 'Política de Conteúdo e Classificação Etária'}
        </h1>
      </div>

      {topic === 'sobre' && (
        <div className="space-y-5 text-sm sm:text-base text-[#858585] leading-relaxed">
          <p className="text-[#F4F4F2] text-lg font-medium">
            O ResenhaPOA nasceu para responder a uma pergunta simples: o que está rolando de bom em
            Porto Alegre hoje?
          </p>
          <p>
            Somos uma plataforma independente focada em cultura urbana, vida noturna, bares,
            festivais, shows e programação gratuita nos bairros da capital gaúcha — da Cidade Baixa
            ao Quarto Distrito, passando pelo Bom Fim, Moinhos de Vento, Centro Histórico e Orla do
            Guaíba.
          </p>
          <p>
            Não vendemos ingressos diretamente nem inventamos números ou avaliações. Quando um
            evento tem venda antecipada, redirecionamos para o canal oficial informado pelo
            organizador. Enquanto organizadores publicam suas agendas, os registros ilustrativos
            são claramente sinalizados como <strong className="text-[#F4F4F2]">Exemplo Demo</strong>.
          </p>
          <div className="p-6 rounded-md bg-[#141414] border border-[#292929] space-y-2 text-sm">
            <p className="font-semibold text-[#F4F4F2]">Canais de contato e envio de pauta</p>
            <p>Organizadores e casas culturais: envie diretamente pela área do organizador.</p>
            <Link
              to="/organizador"
              className="inline-block text-[#F4F4F2] font-bold uppercase tracking-wider text-xs underline"
            >
              Acessar Área do Organizador →
            </Link>
          </div>
        </div>
      )}

      {topic === 'privacidade' && (
        <div className="space-y-5 text-sm sm:text-base text-[#858585] leading-relaxed">
          <p>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), o
            ResenhaPOA coleta apenas os dados estritamente necessários para as funcionalidades que
            você escolhe utilizar:
          </p>
          <ul className="list-disc pl-5 space-y-2.5">
            <li>
              <strong className="text-[#F4F4F2]">Navegação pública:</strong> você pode explorar
              eventos, bares e mapas sem criar conta.
            </li>
            <li>
              <strong className="text-[#F4F4F2]">Conta Google:</strong> ao entrar com o Google,
              armazenamos nome, e-mail, foto de perfil, favoritos e preferências de estilos/bairros
              na sua conta Firebase.
            </li>
            <li>
              <strong className="text-[#F4F4F2]">Localização aproximada:</strong> solicitada apenas
              quando você clica em &quot;Perto de ti&quot; ou busca locais próximos no mapa, nunca
              em segundo plano.
            </li>
            <li>
              <strong className="text-[#F4F4F2]">Votação no Bora Junto:</strong> participantes
              convidados utilizam um identificador anônimo no navegador apenas para impedir votos
              duplicados na mesma enquete.
            </li>
          </ul>
        </div>
      )}

      {topic === 'termos' && (
        <div className="space-y-5 text-sm sm:text-base text-[#858585] leading-relaxed">
          <p>
            O ResenhaPOA atua como guia informativo e plataforma editorial de descoberta em Porto
            Alegre.
          </p>
          <ul className="list-disc pl-5 space-y-2.5">
            <li>
              Horários, valores e disponibilidade de ingressos podem sofrer alterações pelos
              organizadores e casas noturnas. Confira sempre o canal oficial antes de se deslocar.
            </li>
            <li>
              Organizadores são responsáveis pela veracidade das informações enviadas para revisão.
            </li>
            <li>
              Conteúdo publicitário ou destacado mediante parceria é sempre identificado de forma
              clara como <strong className="text-[#F4F4F2]">Patrocinado</strong>.
            </li>
          </ul>
        </div>
      )}

      {topic === 'politica' && (
        <div className="space-y-5 text-sm sm:text-base text-[#858585] leading-relaxed">
          <p>
            Levamos a sério a transparência e a segurança do público jovem em Porto Alegre:
          </p>
          <ul className="list-disc pl-5 space-y-2.5">
            <li>
              <strong className="text-[#F4F4F2]">Classificação etária obrigatória:</strong> todo
              evento publicado deve informar se é{' '}
              <strong className="text-[#F4F4F2]">Livre</strong>,{' '}
              <strong className="text-[#F4F4F2]">16+</strong>,{' '}
              <strong className="text-[#F4F4F2]">18+</strong> ou{' '}
              <strong className="text-[#F4F4F2]">Não informado</strong>.
            </li>
            <li>
              <strong className="text-[#F4F4F2]">Proteção a menores:</strong> eventos 18+ são
              filtrados automaticamente quando o usuário seleciona filtros ou roteiros adequados
              para menores de 18 anos.
            </li>
            <li>
              <strong className="text-[#F4F4F2]">Moderação prévia:</strong> nenhuma submissão de
              organizador ou avaliação de bar é publicada automaticamente sem aprovação da
              curadoria.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
