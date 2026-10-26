import { Children, cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { PRIX, PRIX_FONDATEUR } from '../../api/_prix.js';
import { useIsDesktop } from '../hooks/useMediaQuery';
import NotFound from './NotFound';
import './Legal.css';

// Identité de l'éditeur, à compléter dès l'immatriculation (micro-entreprise).
// Tant qu'un champ est vide, la ligne correspondante n'est pas affichée.
const EDITEUR = {
  nom: 'Johan El Mesmoudi',
  statut: 'Entrepreneur individuel',
  siren: '',      // ex. '123 456 789'
  adresse: '',    // adresse postale (ou domiciliation)
  mediateur: '',  // médiateur de la consommation : nom + site
};
const CONTACT = 'contact@revizapp.fr';

const PAGES = {
  'mentions-legales': {
    title: 'Mentions légales',
    court: 'Mentions légales',
    content: () => (
      <>
        <Section title="Éditeur de l'application">
          <p>Réviz est édité par {EDITEUR.nom}, {EDITEUR.statut}{EDITEUR.siren ? '' : ' (immatriculation en cours)'}.</p>
          {EDITEUR.siren && <p>SIREN : {EDITEUR.siren}<br />TVA non applicable, article 293 B du CGI.</p>}
          {EDITEUR.adresse && <p>Adresse : {EDITEUR.adresse}</p>}
          <p>Email de contact : <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
          <p>Directeur de la publication : {EDITEUR.nom}.</p>
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
    court: 'Confidentialité',
    maj: '25 octobre 2026',
    content: () => (
      <>
        <Section title="Données collectées">
          <ul>
            <li><strong>Compte utilisateur</strong> — prénom, adresse email, classe (optionnel), via Firebase Authentication.</li>
            <li><strong>Connexion avec Google, Apple, Microsoft ou TikTok</strong> — si tu choisis de te connecter avec l'un de ces services, il nous transmet ton nom ou ton pseudo, ton adresse email quand il la fournit (Apple peut la remplacer par une adresse masquée, TikTok ne la fournit pas) et un identifiant technique propre à Réviz. Nous ne recevons jamais ton mot de passe, ni tes contacts, vidéos, publications ou abonnés.</li>
            <li><strong>Date de naissance</strong> — collectée à l'inscription, uniquement pour déterminer si le consentement parental est requis (moins de 15 ans, art. 45 de la loi Informatique et Libertés).</li>
            <li><strong>Leçons scannées</strong> — le texte ou l'image de tes leçons, envoyé à l'IA pour générer les contenus de révision. Ces données ne sont pas conservées côté serveur après traitement.</li>
            <li><strong>Historique</strong> — tes leçons et révisions (format, chapitre, date, score d'un quiz terminé) sont stockées localement sur ton appareil (localStorage) et synchronisées dans ta collection Firestore personnelle. La date de ta première et de ta dernière révision est notée sur ton profil.</li>
            <li><strong>Jours d'ouverture</strong> — avec un compte, les dates (le jour, sans l'heure) où tu ouvres Réviz sont ajoutées à ton profil, pour savoir si les élèves reviennent réviser. Dans ton navigateur, l'app garde seulement la date de ta dernière ouverture, pour ne la compter qu'une fois par jour.</li>
            <li><strong>Mode essai (sans compte)</strong> — pour savoir combien d'élèves reviennent réviser, chaque révision est enregistrée avec un identifiant tiré au hasard sur ton appareil : format, chapitre, classe, matière et date, sans prénom ni rien qui permette de savoir qui tu es. Ces données ne servent qu'à des statistiques et sont effacées 13 mois après ta dernière révision. Si tu crées un compte, ta progression d'essai y est reprise.</li>
            <li><strong>Agenda</strong> — les contrôles que tu notes (matière, date, sujet facultatif), et, si tu relies Pronote, l'adresse de ton emploi du temps, enregistrées sur ton compte. Réviz lit avec cette adresse tes horaires de cours, pour les afficher ; il ne voit ni tes notes, ni tes devoirs, ni tes absences, et ne conserve pas tes cours sur ses serveurs. Tu peux délier Pronote à tout moment depuis l'Agenda.</li>
            <li><strong>Battle</strong> — pour jouer à deux en direct : le prénom ou le surnom que tu choisis, tes réponses et tes temps de réponse. Sans compte, rien d'autre : un identifiant technique anonyme (Firebase) relie tes réponses à la partie, sans email ni date de naissance. Avec un compte, ton total d'aura et ton nombre de battles jouées et gagnées sont ajoutés à ton profil.</li>
            <li><strong>Avis</strong> — ce que tu écris sur la page « Votre avis » (profil, réponses, e-mail facultatif pour recevoir une réponse), sans compte ni identifiant. Conservés 2 ans au plus, supprimés sur simple demande.</li>
            <li><strong>Données techniques</strong> — logs serveur standards (adresse IP, navigateur), conservés maximum 30 jours.</li>
          </ul>
        </Section>

        <Section title="Finalités du traitement">
          <ul>
            <li>Fournir le service de révision (génération IA, suivi de progression).</li>
            <li>Authentifier les utilisateurs.</li>
            <li>T'envoyer, le lendemain de ta première révision, un seul email de rappel qui te ramène sur ton chapitre (et une notification sur l'application mobile, si tu les as autorisées). Pas d'email de rappel avant 15 ans sans l'autorisation d'un parent. Tu peux t'en désinscrire d'un clic depuis l'email.</li>
            <li>Améliorer l'application.</li>
          </ul>
        </Section>

        <Section title="Base légale">
          <p>Le traitement repose sur le <strong>consentement</strong> de l'utilisateur (ou de son représentant légal pour les mineurs de moins de 15 ans), conformément à l'article 6(1)(a) du RGPD et à l'article 45 de la loi Informatique et Libertés.</p>
        </Section>

        <Section title="Mineurs">
          <p>Réviz s'adresse aux élèves du système scolaire français, du collège au lycée. Conformément à la réglementation française, l'utilisation de Réviz par un mineur de moins de 15 ans nécessite l'autorisation d'un parent ou représentant légal, quelle que soit la façon dont il se connecte (email, Google, Apple, Microsoft ou TikTok). L'élève indique l'adresse email d'un parent à l'inscription ou, s'il ne l'a pas sous la main, dans les 15 jours qui suivent ; un email est alors envoyé à ce parent pour qu'il donne son autorisation, valable 10 jours. L'élève peut utiliser l'application pendant ces délais, et reçoit des rappels par email (et par notification sur l'application mobile, s'il les a autorisées) tant que l'adresse n'est pas donnée. Sans adresse sous 15 jours, ou sans autorisation sous 10 jours après l'envoi, son accès est suspendu jusqu'à ce que le parent la donne.</p>
          <p>Chaque service de connexion applique aussi ses propres règles d'âge : par exemple, TikTok est réservé aux 13 ans et plus.</p>
        </Section>

        <Section title="Partage des données">
          <p>Tes données ne sont jamais vendues. Elles sont partagées uniquement avec :</p>
          <ul>
            <li><strong>Ton adversaire de Battle</strong> — pendant une partie, il voit ton prénom ou surnom, si tes réponses sont justes, tes temps de réponse et ton aura de la partie. Rien d'autre.</li>
            <li><strong>Google Firebase</strong> — authentification et stockage (hébergé en Europe).</li>
            <li><strong>Google, Apple, Microsoft, TikTok</strong> — uniquement si tu choisis de te connecter avec l'un d'eux : ce service sait alors que tu utilises Réviz. Nous ne lui envoyons ni tes leçons, ni ta progression, ni aucune autre donnée.</li>
            <li><strong>Pronote (Index Education)</strong> — uniquement si tu relies ton emploi du temps : Réviz y lit ton lien d'emploi du temps, sans rien y envoyer d'autre.</li>
            <li><strong>Anthropic</strong> — traitement IA des leçons (le texte envoyé n'est pas conservé après génération).</li>
            <li><strong>Vercel</strong> — hébergement de l'application.</li>
            <li><strong>Stripe</strong> — paiement de l'abonnement Réviz+. Les coordonnées bancaires sont saisies chez Stripe : Réviz ne les voit ni ne les conserve jamais.</li>
            <li><strong>PostHog</strong> — mesure d'audience anonyme (pages vues et grandes étapes comme créer un compte ou terminer un quiz), hébergée en Europe, sans cookie, sans profil et sans rien enregistrer sur ton appareil.</li>
          </ul>
        </Section>

        <Section title="Durée de conservation">
          <ul>
            <li>Données de compte (y compris l'identifiant transmis par Google, Apple, Microsoft ou TikTok) : jusqu'à suppression du compte. Si tu as créé ton compte avec Apple dans l'app iPhone, sa suppression retire aussi l'accès que tu avais donné à Réviz chez Apple. Pour les autres services, tu peux retirer cet accès à tout moment depuis les réglages de ton compte Google, Microsoft ou TikTok.</li>
            <li>Leçons et révisions : jusqu'à suppression par l'utilisateur (max 100 leçons conservées).</li>
            <li>Révisions en mode essai : 13 mois après la dernière révision.</li>
            <li>Parties de Battle : supprimées automatiquement au plus tard 48 heures après leur création. Avec un compte, l'aura totale et le nombre de battles restent sur ton profil jusqu'à la suppression du compte.</li>
            <li>Agenda : adresse Pronote jusqu'à ce que tu délies Pronote ou supprimes ton compte ; contrôles jusqu'à ce que tu les retires ou supprimes ton compte (ceux passés depuis plus d'un mois sont effacés quand tu en notes un nouveau).</li>
            <li>Logs serveur : 30 jours maximum.</li>
            <li>Factures d'abonnement : 10 ans (obligation comptable).</li>
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
          <p>Pour exercer ces droits : <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
          <p>Tu peux aussi contacter la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a></p>
        </Section>

        <Section title="Cookies">
          <p>Réviz utilise uniquement des cookies strictement nécessaires au fonctionnement (authentification Firebase, et un cookie de sécurité de 10 minutes au plus pendant une connexion avec TikTok, supprimé dès la connexion terminée). Aucun cookie publicitaire ou de tracking n'est utilisé. La mesure d'audience (PostHog) fonctionne sans cookie et sans rien enregistrer sur ton appareil : elle compte les visites de façon anonyme, sans savoir qui tu es. Le compteur des retours se sert seulement de la date de ta dernière ouverture, gardée dans ton navigateur (voir « Jours d'ouverture »).</p>
        </Section>
      </>
    ),
  },

  'cgv': {
    title: 'Conditions Générales de Vente',
    court: 'CGV Réviz+',
    maj: '11 octobre 2026',
    content: () => (
      <>
        <Section title="Objet">
          <p>Les présentes CGV encadrent la souscription à <strong>Réviz+</strong>, l'abonnement payant de l'application Réviz, vendu par {EDITEUR.nom}, {EDITEUR.statut}{EDITEUR.siren ? `, SIREN ${EDITEUR.siren}` : ' (immatriculation en cours)'}. Elles complètent les <Link to="/legal/cgu">CGU</Link>.</p>
        </Section>

        <Section title="Ce que comprend Réviz+">
          <p>Réviz+ étend le plan gratuit : leçons analysées et messages au coach sans limite (dans la limite d'un usage normal : des garde-fous techniques bloquent les usages automatisés ou abusifs), thèmes de couleur réservés, et les fonctions signalées « Réviz+ » dans l'application. Le contenu de Réviz+ peut s'enrichir ; il n'est jamais réduit sans que tu en sois prévenu et que tu puisses résilier. Le plan gratuit reste disponible sans abonnement.</p>
        </Section>

        <Section title="Qui peut s'abonner">
          <p>L'abonnement est souscrit et payé par une personne majeure titulaire du moyen de paiement, en général un parent pour le compte de son enfant, qui utilise Réviz avec son propre compte.</p>
        </Section>

        <Section title="Prix">
          <p>Réviz+ coûte <strong>{PRIX.annuel.montant} TTC par an</strong> ou <strong>{PRIX.mensuel.montant} TTC par mois</strong>{EDITEUR.siren ? ' (TVA non applicable, article 293 B du CGI)' : ''}.</p>
          <p><strong>Tarif fondateur.</strong> Un abonnement souscrit avant le 26 octobre 2026 à 0 h (heure de Paris) est facturé {PRIX_FONDATEUR.annuel.montant} par an ou {PRIX_FONDATEUR.mensuel.montant} par mois, tant qu'il n'est pas résilié. En cas de résiliation, un nouvel abonnement se fait au prix en vigueur.</p>
          <p>Toute évolution du prix est annoncée par email au moins 30 jours avant de s'appliquer ; tu peux résilier avant, sans frais.</p>
        </Section>

        <Section title="Paiement">
          <p>Le paiement se fait par carte bancaire via Stripe, prestataire de paiement sécurisé. Pour un abonnement souscrit avant le 26 octobre 2026, rien n'est prélevé à la souscription : la carte est enregistrée et le premier prélèvement a lieu le 26 octobre 2026, puis à chaque échéance (chaque année ou chaque mois à cette date). Après cette date, le premier paiement a lieu à la souscription, puis à chaque échéance.</p>
        </Section>

        <Section title="Durée, renouvellement et résiliation">
          <p>L'abonnement est annuel ou mensuel et se renouvelle automatiquement. Pour l'abonnement annuel, un email te rappelle l'échéance avant le renouvellement.</p>
          <p>Tu peux le résilier à tout moment, sans frais, depuis <strong>Réglages → Gérer mon abonnement</strong>, ou par email. Résilié avant le 26 octobre 2026, un abonnement au tarif fondateur n'est jamais prélevé. Sinon, la résiliation prend effet à la fin de la période déjà payée : Réviz+ reste actif jusque-là, puis le compte repasse au plan gratuit sans perdre ses leçons ni sa progression.</p>
        </Section>

        <Section title="Droit de rétractation">
          <p>Tu disposes de <strong>14 jours</strong> pour changer d'avis, sans avoir à te justifier, à compter de la souscription ou, si ce prélèvement intervient plus tard, du premier prélèvement : écris à <a href={`mailto:${CONTACT}`}>{CONTACT}</a> et la somme prélevée est remboursée en entier, sous 14 jours, sur la carte utilisée.</p>
        </Section>

        <Section title="Impayés">
          <p>Si un prélèvement échoue, Stripe le retente pendant quelques jours et Réviz+ reste actif pendant ce temps. Si le paiement n'aboutit pas, l'abonnement s'arrête et le compte repasse au plan gratuit.</p>
        </Section>

        <Section title="Réclamations et médiation">
          <p>Pour toute réclamation : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Une réponse est apportée sous 7 jours.</p>
          {EDITEUR.mediateur && <p>En cas de désaccord persistant, tu peux saisir gratuitement le médiateur de la consommation : {EDITEUR.mediateur}.</p>}
          <p>Les présentes CGV sont soumises au droit français.</p>
        </Section>
      </>
    ),
  },

  'cgu': {
    title: "Conditions Générales d'Utilisation",
    court: 'CGU',
    maj: '16 octobre 2026',
    content: () => (
      <>
        <Section title="Objet">
          <p>Les présentes CGU régissent l'utilisation de l'application Réviz, un outil de révision scolaire assisté par intelligence artificielle, destiné aux collégiens.</p>
        </Section>

        <Section title="Inscription">
          <p>L'inscription est gratuite. Tu peux créer ton compte avec un prénom, une adresse email et un mot de passe, ou te connecter avec un compte Google, Apple, Microsoft ou TikTok. Dans tous les cas, ta date de naissance et ta classe te sont demandées. Les utilisateurs de moins de 15 ans doivent disposer de l'autorisation d'un parent ou représentant légal, demandée par email au parent dont tu donnes l'adresse, à l'inscription ou dans les 15 jours qui suivent. Ton accès est suspendu si l'adresse n'est pas donnée sous 15 jours, ou si ton parent n'a pas donné son autorisation dans les 10 jours suivant l'envoi.</p>
          <p>Si tu te connectes avec un autre service, ce sont aussi ses conditions d'utilisation qui s'appliquent à ce compte (par exemple l'âge minimum de TikTok).</p>
          <p>Tu es responsable de la confidentialité de tes identifiants de connexion, y compris ceux du compte Google, Apple, Microsoft ou TikTok que tu utilises pour te connecter.</p>
        </Section>

        <Section title="Utilisation du service">
          <p>Réviz te permet de :</p>
          <ul>
            <li>Scanner tes leçons (texte ou photo).</li>
            <li>Générer des flashcards, quiz, résumés et cartes mentales via l'IA.</li>
            <li>Suivre ta progression et tes révisions.</li>
            <li>Défier quelqu'un en Battle, un quiz à deux en direct sur un chapitre du programme.</li>
          </ul>
          <p>L'utilisation est strictement personnelle et non commerciale.</p>
        </Section>

        <Section title="Battle">
          <p>Une Battle se joue avec une personne à qui tu as donné le code de la partie. Le prénom ou le surnom que tu choisis est vu par ton adversaire : il ne doit être ni injurieux, ni celui de quelqu'un d'autre.</p>
          <p>L'aura récompense des bonnes réponses données par toi-même. Réviz peut retirer l'aura obtenue en trichant ou en jouant contre ses propres comptes.</p>
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
            <li>Plan gratuit : 5 leçons analysées par semaine. Pendant le lancement (jusqu'au 25 octobre 2026), Réviz+ est offert à tous : 30 leçons par semaine.</li>
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
          <p>Pour toute question : <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
        </Section>
      </>
    ),
  },
};

// Ordre des pastilles et de « Les autres textes ».
const ORDRE = ['mentions-legales', 'confidentialite', 'cgu', 'cgv'];

const Fleche = ({ d, taille = 14 }) => (
  <svg viewBox="0 0 14 14" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const GAUCHE = 'M9 2.5L4.5 7 9 11.5';
const DROITE = 'M5 3l4 4-4 4';
const HAUT = 'M3 9l4-4 4 4';

/** Section numérotée (rond lavande + titre) ; `n` est posé par la page. */
function Section({ n, title, children }) {
  return (
    <section className="legal-section" id={`section-${n}`} aria-labelledby={`section-${n}-titre`}>
      <h2 className="legal-section-title" id={`section-${n}-titre`}>
        <span className="legal-rond" aria-hidden="true">{n}</span>
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

const calme = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Textes légaux (handoff Claude Design du 22/10) : retour rond, surtitre, titre, date de mise
 * à jour, pastilles vers les autres textes (téléphone), sommaire numéroté, sections numérotées,
 * « Retour en haut ». Sur ordinateur : sommaire collé à gauche (section en cours sur fond blanc),
 * texte dans une carte blanche de 680 px, « Retour en haut » flottant après un écran.
 */
export default function Legal() {
  const { page } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const defile = useRef(null);
  const [actif, setActif] = useState(1);
  const [loin, setLoin] = useState(false);
  const data = PAGES[page];

  // Sections numérotées, tirées du contenu tel qu'il est écrit (les textes restent intacts).
  const sections = data
    ? Children.toArray(data.content().props.children)
        .filter(el => isValidElement(el) && el.type === Section)
        .map((el, i) => cloneElement(el, { n: i + 1 }))
    : [];

  const allerA = useCallback((cible, doux = true) => {
    const el = typeof cible === 'number' ? document.getElementById(`section-${cible}`) : null;
    const zone = defile.current;
    if (!zone) return;
    const comportement = doux && !calme() ? 'smooth' : 'auto';
    if (el) el.scrollIntoView({ behavior: comportement, block: 'start' });
    else zone.scrollTo?.({ top: 0, behavior: comportement });
  }, []);

  // Nouveau texte : en haut, ou sur la section demandée (/legal/cgu#section-3).
  useEffect(() => {
    const n = Number(/^#section-(\d+)$/.exec(hash || '')?.[1]);
    if (n) allerA(n, false);
    else if (defile.current) defile.current.scrollTop = 0;
    setActif(n || 1);
  }, [page, hash, allerA]);

  // Section en cours (sommaire collé) et « Retour en haut » flottant après un écran.
  const suivre = () => {
    const zone = defile.current;
    if (!zone) return;
    setLoin(zone.scrollTop > zone.clientHeight);
    if (!isDesktop) return;
    const haut = zone.getBoundingClientRect().top + 140;
    let courant = 1;
    sections.forEach((_, i) => {
      const el = document.getElementById(`section-${i + 1}`);
      if (el && el.getBoundingClientRect().top <= haut) courant = i + 1;
    });
    if (zone.scrollTop + zone.clientHeight >= zone.scrollHeight - 4) courant = sections.length;
    setActif(courant);
  };

  const retour = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/');
  };

  if (!data) return <NotFound />;

  const autres = ORDRE.filter(slug => slug !== page);
  const lienSection = (n, contenu, className) => (
    <a
      key={n}
      href={`#section-${n}`}
      className={className}
      aria-current={isDesktop && actif === n ? 'location' : undefined}
      onClick={e => { e.preventDefault(); setActif(n); allerA(n); }}
    >
      {contenu}
    </a>
  );
  const titreSection = el => el.props.title;

  const sommaire = (
    <nav className="legal-sommaire" aria-label="Sommaire">
      <span className="legal-sur">Sommaire</span>
      <ol>
        {sections.map((el, i) => (
          <li key={i}>
            {lienSection(i + 1, (
              <>
                <span className="legal-rond legal-rond--petit" aria-hidden="true">{i + 1}</span>
                <span className="legal-sommaire-txt">{titreSection(el)}</span>
                {!isDesktop && <Fleche d={DROITE} />}
              </>
            ), `legal-sommaire-lien${isDesktop && actif === i + 1 ? ' is-actif' : ''}`)}
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <div className={`app app--no-halo app--large legal-page${isDesktop ? ' legal-page--large' : ''}`}>
      <div className="legal-defile" ref={defile} onScroll={suivre}>
        <div className="legal-header">
          <button type="button" className="legal-back" onClick={retour} aria-label="Retour">
            <Fleche d={GAUCHE} taille={18} />
          </button>
          {isDesktop && <span className="legal-logo">Réviz</span>}
        </div>

        <div className="legal-grille">
          {isDesktop && (
            <aside className="legal-cote">
              {sommaire}
              <nav className="legal-autres" aria-label="Les autres textes">
                <span className="legal-sur">Les autres textes</span>
                {autres.map(slug => (
                  <Link key={slug} to={`/legal/${slug}`} replace>{PAGES[slug].title}</Link>
                ))}
              </nav>
            </aside>
          )}

          <main className="legal-corps">
            <span className="legal-sur legal-sur--titre">Textes légaux</span>
            <h1 className="legal-title">{data.title}</h1>
            {data.maj && <p className="legal-updated"><i aria-hidden="true" />Mise à jour le {data.maj}</p>}

            {!isDesktop && (
              <>
                <nav className="legal-docs" aria-label="Les autres textes">
                  {ORDRE.map(slug => (
                    <Link
                      key={slug}
                      to={`/legal/${slug}`}
                      replace
                      className={`legal-doc${slug === page ? ' is-actif' : ''}`}
                      aria-current={slug === page ? 'page' : undefined}
                    >
                      {PAGES[slug].court}
                    </Link>
                  ))}
                </nav>
                {sommaire}
              </>
            )}

            <div className="legal-content">
              {sections}
            </div>

            {!isDesktop && (
              <button type="button" className="legal-haut" onClick={() => allerA(null)}>
                <Fleche d={HAUT} />Retour en haut
              </button>
            )}
          </main>
        </div>

        {isDesktop && loin && (
          <button type="button" className="legal-haut legal-haut--flottant" onClick={() => allerA(null)}>
            <Fleche d={HAUT} />Retour en haut
          </button>
        )}
      </div>
    </div>
  );
}
