import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MyMemo crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">문제가 발생했습니다</h1>
          <p className="text-sm text-slate-600 mb-6">
            앱을 표시하는 중 오류가 발생했습니다. 새로고침해도 계속되면 브라우저 저장소를 확인해 주세요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }
}
