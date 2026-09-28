import { Component } from 'react';
import { RotateCcw } from 'lucide-react';

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DevCollab render failed.', error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f3f8] px-5 text-[#17151d]">
        <section aria-labelledby="app-error-title" className="w-full max-w-md rounded-xl border border-[#dedbe7] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#b9a6f1]">DevCollab</p>
          <h1 className="font-display mt-3 text-xl font-semibold" id="app-error-title">We hit a problem loading this page.</h1>
          <p className="mt-2 text-sm leading-6 text-[#aaa8b6]">Reload the app to try again. Your account data is unchanged.</p>
          {import.meta.env.DEV && <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg bg-[#f4f3f8] p-3 text-xs text-[#17151d]">{this.state.error.message}</pre>}
          <button className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#7254bd] px-4 text-sm font-semibold text-white transition hover:bg-[#6047a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5b4ff]" onClick={() => window.location.reload()} type="button"><RotateCcw aria-hidden="true" size={15} />Reload app</button>
        </section>
      </main>
    );
  }
}
