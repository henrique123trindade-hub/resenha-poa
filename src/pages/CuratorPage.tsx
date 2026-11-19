import React from 'react';
import { AiCuratorPanel } from '../components/AiCuratorPanel';

export const CuratorPage: React.FC = () => {
  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 text-[#F4F4F2]">
      <div className="pb-6 border-b border-[#292929]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858585] mb-2">
          Pesquisa ao vivo · Porto Alegre
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Curadoria inteligente POA
        </h1>
        <p className="text-sm sm:text-base text-[#858585] mt-2 max-w-2xl">
          Pesquise programação atualizada na web, localize bares e espaços reais pelo Google Maps ou
          monte um roteiro personalizado respeitando orçamento, bairro e classificação etária.
        </p>
      </div>

      <AiCuratorPanel />
    </div>
  );
};
