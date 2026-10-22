import { Mascot } from './Mascot';
import { Component } from 'react';
import { hideSplash } from '../services/splash';
import './ErrorBoundary.css';

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
    // L'écran d'erreur doit être visible même si le plantage précède le premier rendu.
    hideSplash();
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Écran statique (pas de Pantin ni de dépendance chargée à la demande) : l'app vient de planter.
    return (
      <div className="app app--no-halo eb-page" role="alert">
        <div className="eb-hero">
          <span className="eb-deco eb-deco--a" aria-hidden="true" />
          <span className="eb-deco eb-deco--b" aria-hidden="true" />
          <Mascot pose="confused" size={170} priority alt="" aria-hidden="true" className="eb-reviz" />
        </div>
        <div className="eb-bas">
          <span className="eb-sur">Petit souci</span>
          <h1 className="eb-titre">Oups, quelque chose a planté</h1>
          <p className="eb-texte">Pas de panique, ça arrive. Ta progression est gardée.</p>
          <button type="button" className="eb-btn" onClick={this.handleReload}>Retour à l'accueil</button>
        </div>
      </div>
    );
  }
}
