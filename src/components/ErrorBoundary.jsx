import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Réviz] Erreur capturée :', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="app" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 32, textAlign: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 48 }}>😵</span>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Oups, quelque chose a planté
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Pas de panique, ça arrive. Essaie de recharger la page.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            marginTop: 8, padding: '14px 32px', borderRadius: 14,
            background: 'var(--bg-cta)', color: 'var(--text-cta)',
            border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }
}
