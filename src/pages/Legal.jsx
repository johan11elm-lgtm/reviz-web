import { Link, useParams } from 'react-router-dom';
import './Legal.css';

const PAGES = {
  'mentions-legales': {
    title: 'Mentions légales',
    content: () => (
      <>
        <Section title="Éditeur de l'application">
          <p>Réviz est édité par Johan El Mesmoudi.</p>
          <p>Email de contact : <a href="mailto:johan11elm@gmail.com">johan11elm@gmail.com</a></p>
        </Section>

        <Section title="Hébergement">
          <p>L'application est hébergée par :</p>
          <p><strong>Vercel Inc.</strong><br />
          440 N Barranca Ave #4133<br />
          Covina, CA 91723, États-Unis</p>
          <p>Les données utilisateur sont stockées via <strong>Google Firebase</strong> (région europe-west3).</p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>L'ensemble du contenu de Réviz (design, code, textes, logos) est protégé par le droit d'auteur. Toute reproduction sans autorisation est interdite.</p>
          <p>Les leçons scannées par les utilisateurs restent leur propriété.</p>
        </Section>

        <Section title="Contenu généré par IA">
          <p>Les flashcards, quiz, résumés et cartes mentales sont générés automatiquement par intelligence artificielle (Anthropic Claude). Ce contenu est fourni à titre indicatif et peut contenir des erreurs. Réviz ne garantit pas l'exactitude des contenus générés.</p>
        </Section>
      </>
    ),
  },

  'confidentialite': {
    title: 'Politique de confidentialité',
    content: () => (
      <>
        <p className="legal-updated">Dernière mise à jour : 21 mars 2026</p>

        <Section title="Données collectées">
          <ul>
            <li><strong>Compte utilisateur</strong> — prénom, adresse email, classe (optionnel), via Firebase Authentication.</li>
            <li><strong>Leçons scannées</strong> — le texte ou l'image de tes leçons, envoyé à l'IA pour générer les contenus de révision. Ces données ne sont pas conservées côté serveur après traitement.</li>
            <li><strong>Historique</strong> — tes leçons et révisions sont stockées localement sur ton appareil (localStorage) et synchronisées dans ta collection Firestore personnelle.</li>
            <li><strong>Données techniques</strong> — logs serveur standards (adresse IP, navigateur), conservés maximum 30 jours.</li>
          </ul>
        </Section>

        <Section title="Finalités du traitement">
          <ul>
            <li>Fournir le service de révision (génération IA, suivi de progression).</li>
            <li>Authentifier les utilisateurs.</li>
            <li>Améliorer l'application.</li>
          </ul>
        </Section>

        <Section title="Base légale">
          <p>Le traitement repose sur le <strong>consentement</strong> de l'utilisateur (ou de son représentant légal pour les mineurs de moins de 15 ans), conformément à l'article 6(1)(a) du RGPD et à l'article 45 de la loi Informatique et Libertés.</p>
        </Section>

        <Section title="Mineurs">
          <p>Réviz s'adresse aux collégiens (11-15 ans). Conformément à la réglementation française, les utilisateurs de moins de 15 ans doivent obtenir l'autorisation d'un parent ou représentant légal pour créer un compte.</p>
        </Section>

        <Section title="Partage des données">
          <p>Tes données ne sont jamais vendues. Elles sont partagées uniquement avec :</p>
          <ul>
            <li><strong>Google Firebase</strong> — authentification et stockage (hébergé en Europe).</li>
            <li><strong>Anthropic</strong> — traitement IA des leçons (le texte envoyé n'est pas conservé après génération).</li>
            <li><strong>Vercel</strong> — hébergement de l'application.</li>
          </ul>
        </Section>

        <Section title="Durée de conservation">
          <ul>
            <li>Données de compte : jusqu'à suppression du compte.</li>
            <li>Leçons et révisions : jusqu'à suppression par l'utilisateur (max 20 leçons).</li>
            <li>Logs serveur : 30 jours maximum.</li>
          </ul>
        </Section>

        <Section title="Tes droits">
          <p>Conformément au RGPD, tu disposes des droits suivants :</p>
          <ul>
            <li><strong>Accès</strong> — consulter tes données personnelles.</li>
            <li><strong>Rectification</strong> — corriger tes informations.</li>
            <li><strong>Suppression</strong> — supprimer ton compte et tes données.</li>
            <li><strong>Portabilité</strong> — récupérer tes données dans un format lisible.</li>
            <li><strong>Opposition</strong> — t'opposer au traitement de tes données.</li>
          </ul>
          <p>Pour exercer ces droits : <a href="mailto:johan11elm@gmail.com">johan11elm@gmail.com</a></p>
          <p>Tu peux aussi contacter la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a></p>
        </Section>

        <Section title="Cookies">
          <p>Réviz utilise uniquement des cookies strictement nécessaires au fonctionnement (authentification Firebase). Aucun cookie publicitaire ou de tracking n'est utilisé.</p>
        </Section>
      </>
    ),
  },

  'cgu': {
    title: "Conditions Générales d'Utilisation",
    content: () => (
      <>
        <p className="legal-updated">Dernière mise à jour : 21 mars 2026</p>

        <Section title="Objet">
          <p>Les présentes CGU régissent l'utilisation de l'application Réviz, un outil de révision scolaire assisté par intelligence artificielle, destiné aux collégiens.</p>
        </Section>

        <Section title="Inscription">
          <p>L'inscription est gratuite et nécessite un prénom, une adresse email et un mot de passe. Les utilisateurs de moins de 15 ans doivent disposer de l'autorisation d'un parent ou représentant légal.</p>
          <p>Tu es responsable de la confidentialité de tes identifiants de connexion.</p>
        </Section>

        <Section title="Utilisation du service">
          <p>Réviz te permet de :</p>
          <ul>
            <li>Scanner tes leçons (texte ou photo).</li>
            <li>Générer des flashcards, quiz, résumés et cartes mentales via l'IA.</li>
            <li>Suivre ta progression et tes révisions.</li>
          </ul>
          <p>L'utilisation est strictement personnelle et non commerciale.</p>
        </Section>

        <Section title="Contenu généré par IA">
          <p>Les contenus de révision sont générés automatiquement par intelligence artificielle. Réviz ne garantit pas leur exactitude, exhaustivité ou pertinence pédagogique. Ces contenus sont fournis à titre d'aide et ne remplacent pas l'enseignement.</p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>Les leçons que tu scannes restent ta propriété. En les soumettant, tu autorises Réviz à les traiter par IA dans le seul but de générer tes contenus de révision.</p>
          <p>Le code, le design et la marque Réviz sont protégés par le droit d'auteur.</p>
        </Section>

        <Section title="Limites d'utilisation">
          <ul>
            <li>Plan gratuit : 5 leçons analysées par mois.</li>
            <li>Il est interdit de scanner des contenus illicites ou portant atteinte aux droits de tiers.</li>
            <li>Toute utilisation abusive peut entraîner la suspension du compte.</li>
          </ul>
        </Section>

        <Section title="Responsabilité">
          <p>Réviz est fourni « en l'état ». Nous ne garantissons pas un service ininterrompu ou exempt d'erreurs. Réviz ne peut être tenu responsable des dommages liés à l'utilisation de l'application ou des contenus générés par l'IA.</p>
        </Section>

        <Section title="Modification des CGU">
          <p>Ces conditions peuvent être modifiées à tout moment. La poursuite de l'utilisation après modification vaut acceptation des nouvelles conditions.</p>
        </Section>

        <Section title="Contact">
          <p>Pour toute question : <a href="mailto:johan11elm@gmail.com">johan11elm@gmail.com</a></p>
        </Section>
      </>
    ),
  },
};

function Section({ title, children }) {
  return (
    <div className="legal-section">
      <h2 className="legal-section-title">{title}</h2>
      {children}
    </div>
  );
}

export default function Legal() {
  const { page } = useParams();
  const data = PAGES[page];

  if (!data) return <div className="app"><p style={{ padding: 24 }}>Page introuvable.</p></div>;

  return (
    <div className="app">
      <div className="legal-header">
        <Link to="/welcome" className="legal-back">←</Link>
        <span className="legal-title">{data.title}</span>
      </div>
      <div className="legal-content">
        {data.content()}
      </div>
    </div>
  );
}
