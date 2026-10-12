# Connexion avec Apple, Microsoft et TikTok

Google est toujours proposé. Les autres boutons restent **cachés** tant
qu'ils ne sont pas listés dans `VITE_AUTH_PROVIDERS`. On active un
fournisseur une fois sa configuration terminée, jamais avant (sinon le
bouton mène à une erreur).

| Fournisseur | Web | App iOS | Côté code |
|---|---|---|---|
| Google | popup Firebase | SDK natif | inchangé |
| Apple | popup Firebase | SDK natif (jeton + nonce) | `AuthContext.loginNatif` |
| Microsoft | popup Firebase | connexion native → `/api/auth` (jeton personnalisé) | `api/auth.js` |
| TikTok | redirection → `/api/auth` (jeton personnalisé) | **non proposé** (pas de retour vers l'app) | `api/auth.js` |

## Ce qui se passe après la connexion

- **Fin d'inscription** : tout compte sans mot de passe qui n'a pas de
  date de naissance passe par `/finish-setup`. On y demande la date de
  naissance et la classe, plus le prénom s'il manque (Apple ne le donne
  qu'à la première connexion, TikTok peut ne donner qu'un pseudo). Pour
  les moins de 15 ans, le consentement parental suit, comme pour l'e-mail.
- **Pas d'e-mail de confirmation** : `api/_compteVerifie.js` considère
  comme vérifiés les comptes Google et Apple (e-mail déjà confirmé),
  Microsoft, ainsi que les comptes portant le claim `reviz_social`, posé
  par `/api/auth` sur les comptes TikTok et Microsoft iOS. Ils peuvent
  scanner, parler au coach et s'abonner tout de suite.
- **Comptes TikTok** : uid `tiktok:<open_id>`, sans e-mail.
- **Suppression de compte** : pas de mot de passe redemandé aux comptes
  sans mot de passe. Pour un compte Apple dans l'app iOS, on redemande la
  connexion Apple puis on révoque l'accès (exigé par l'App Store, 5.1.1).

## Apple

> Obligatoire pour l'App Store : dès que l'app iOS propose Google, elle
> doit aussi proposer une connexion respectueuse de la vie privée (4.8).

1. **Apple Developer → Identifiers** : sur l'App ID `com.reviz.app`,
   cocher *Sign in with Apple*.
2. **Identifiers → Services IDs** : en créer un pour le web (par ex.
   `com.reviz.app.web`), activer *Sign in with Apple*, puis le configurer :
   - domaines : `app.revizapp.fr` et le domaine `*.firebaseapp.com` du
     projet ;
   - Return URL : `https://<authDomain>/__/auth/handler`.
3. **Keys** : créer une clé avec *Sign in with Apple*, télécharger le
   `.p8`, noter le Key ID et le Team ID.
4. **Firebase → Authentication → Sign-in method → Apple** : activer, puis
   renseigner le Services ID, le Team ID, le Key ID et la clé privée. Ces
   informations servent aussi à la révocation à la suppression du compte.
5. **Xcode** → cible *App* → *Signing & Capabilities* → *+ Capability* →
   *Sign in with Apple*.

## Microsoft

1. **Portail Azure → App registrations → New registration** :
   - comptes acceptés : *any organizational directory and personal
     Microsoft accounts* (comptes perso et comptes Office 365 des
     établissements) ;
   - Redirect URI (Web) : `https://<authDomain>/__/auth/handler`.
2. **Certificates & secrets** : créer un secret client. Il expire :
   noter la date pour le renouveler.
3. **Firebase → Sign-in method → Microsoft** : activer, puis renseigner
   l'Application (client) ID et le secret.
4. iOS : rien à ajouter. Le schéma d'URL `REVERSED_CLIENT_ID` (déjà dans
   `Info.plist` pour Google) sert aussi au retour Microsoft.

Certains établissements bloquent les applications tierces : leurs élèves
verront une demande d'accord d'administrateur. Ils peuvent alors passer
par un autre bouton.

## TikTok (web seulement)

1. **developers.tiktok.com** : créer une app, ajouter *Login Kit*
   (plateforme Web) avec le scope `user.info.basic`.
2. Redirect URI : `https://app.revizapp.fr/api/auth`.
3. Liens demandés pour la validation :
   - confidentialité : `https://app.revizapp.fr/legal/confidentialite`
   - CGU : `https://app.revizapp.fr/legal/cgu`
4. Soumettre l'app à la validation TikTok. En attendant, seuls les
   comptes testeurs déclarés peuvent se connecter.
5. **Vercel → Environment Variables** (Production) :
   `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`. `APP_URL` est facultatif
   (`https://app.revizapp.fr` par défaut).

Limites : TikTok est réservé aux 13 ans et plus et ne transmet pas
d'e-mail.

## Allumer les boutons

- **Web (Vercel)** : `VITE_AUTH_PROVIDERS=apple,microsoft,tiktok` (ne
  mettre que ceux qui sont configurés), puis redéployer.
- **App iOS** : `VITE_AUTH_PROVIDERS=apple,microsoft` dans `.env.ios`,
  puis `npm run build:ios`. TikTok y est ignoré de toute façon.

## Limite Vercel : 12 fonctions

Le plan Hobby refuse un déploiement de plus de 12 fonctions dans `api/`.
Les fichiers qui commencent par `_` ne comptent pas. C'est pour ça que
Stripe tient en une fonction (`api/abonnement.js`, avec des réécritures
pour garder `/api/create-checkout` et `/api/create-billing-portal`), et
que les deux usages de la connexion partagent `api/auth.js`. Toute
nouvelle route doit rejoindre une fonction existante.
