import React from 'react';
import { AiCuratorPanel } from '../components/AiCuratorPanel';
import { SectionKicker } from '../components/BrandMark';

export const CuratorPage: React.FC = () => {
  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 text-[#F7F7F5]">
      <div className="pb-6 border-b border-[#28282E]">
        <SectionKicker label="Pesquisa ao vivo · Porto Alegre" accentColor="#5265FF" className="mb-2" />
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Curadoria inteligente POA
        </h1>
        <p className="text-sm sm:text-base text-[#98989F] mt-2 max-w-2xl">
          Pesquise programação atualizada na web, localize bares e espaços reais pelo mapa ou monte
          um roteiro personalizado respeitando orçamento, bairro e classificação etária.
        </p>
      </div>

      <AiCuratorPanel />
    </div>
  );
};
