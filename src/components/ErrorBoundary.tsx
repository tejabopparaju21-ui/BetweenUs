import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Heart, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('BetweenUs Uncaught UI Error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      // Clear any corrupted transient call/modal cache if needed
      sessionStorage.removeItem('betweenus_call_session_id');
    } catch (_) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-pink-50 flex items-center justify-center p-4 text-center select-none">
          <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-rose-100 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mb-4 shadow-sm animate-pulse">
              <Heart className="w-8 h-8 fill-rose-500" />
            </div>

            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              BetweenUs Sanctuary ❤️
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              We encountered a momentary hiccup while loading your private space. Don't worry, your chats, memories, and couple data are completely safe!
            </p>

            <button
              type="button"
              onClick={this.handleReset}
              className="mt-6 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-sm shadow-lg shadow-rose-300/50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer tap-bounce"
            >
              <RefreshCw className="w-4 h-4 animate-spin-reverse" />
              <span>Tap to Reload BetweenUs</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
