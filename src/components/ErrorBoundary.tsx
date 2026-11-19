import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Erro inesperado ao carregar esta página.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('ResenhaPOA ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080808] text-[#F4F4F2] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#141414] border border-[#292929] rounded-lg p-8 space-y-4">
            <p className="font-label text-xs uppercase tracking-widest text-[#858585] font-semibold">
              ResenhaPOA · Recuperação
            </p>
            <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
              Algo saiu do roteiro.
            </h1>
            <p className="text-sm text-[#858585] leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="px-5 py-3 bg-[#F4F4F2] hover:bg-white text-[#080808] font-bold text-xs uppercase tracking-wider rounded-md"
            >
              Voltar para a página inicial
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
