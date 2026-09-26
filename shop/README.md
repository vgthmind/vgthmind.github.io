# Prototype de boutique hors BigCartel

Ce dossier est un prototype autonome, gratuit, hors BigCartel — teste en parallele
sans rien couper ni publier sur le site actuel. Rien ici n'affecte vgthmind.bigcartel.com.

Objectif rappele (discute dans une conversation precedente) : sortir de BigCartel
en gardant Stripe (deja utilise), en gardant une interface simple pour ajouter des
pieces (proche de l'admin BigCartel), et sans payer d'hebergement — juste le nom
de domaine, comme aujourd'hui.

## Architecture choisie

- **Site** : pages statiques (`shop/index.html`, `shop/product.html`), hebergees
  gratuitement sur GitHub Pages (meme domaine que ce depot).
- **Gestion des pieces** : [Decap CMS](https://decapcms.org) (gratuit, open-source,
  licence MIT) — un formulaire web pour ajouter/modifier une piece (nom, prix,
  photos, description...), qui commit directement dans ce depot Git. Pas de
  base de donnees a gerer.
- **Donnees produits** : un fichier JSON par piece dans `shop/data/products/`.
  Une GitHub Action (`.github/workflows/build-shop-products-index.yml`)
  regenere automatiquement `shop/data/products.json` (le fichier que les pages
  lisent) a chaque modification — gratuit, inclus dans GitHub.
- **Paiement** : [Stripe Payment Links](https://stripe.com/payments/payment-links)
  — un lien de paiement cree en 2 clics par piece depuis ton dashboard Stripe
  existant (celui deja utilise via BigCartel), colle dans le champ correspondant
  de la fiche produit. Aucun code a ecrire, memes frais Stripe qu'aujourd'hui
  (2,9% + 0,30 EUR, pas de commission supplementaire).
- **Pieces uniques (stock = 1)** : Stripe gere ca nativement — sur le Payment
  Link, option "Limit the number of payments" mise a 1 : des qu'une piece est
  payee, le lien se desactive tout seul (plus besoin de gerer un stock a la main).

Cout total : 0 EUR/mois (uniquement le nom de domaine, comme actuellement).

**Precision utile (recherchee cette nuit) :** la conversation precedente evoquait
"un petit bout de serveur pour les confirmations de commande" comme brique a
assembler en plus. En verifiant : ce n'est en fait **pas necessaire** pour le
strict minimum — Stripe envoie deja nativement un recu au client (a activer
dans Customer emails settings) et peut notifier le vendeur par email a chaque
paiement reussi (Personal details > notification preferences), sans code ni
serveur. Un vrai serveur ne serait utile que pour automatiser autre chose
(ex. mise a jour d'une feuille de calcul, envoi vers un outil de gestion de
stock) — pas indispensable pour demarrer.

**Limite honnete a garder en tete :** BigCartel gere nativement le panier
multi-articles avec frais de port combines (deja note comme un point fort
dans `bigcartel_contexte_reprise.md`). Les Payment Links Stripe sont plutot
penses "un lien = un achat" ; regrouper plusieurs pieces differentes dans un
seul paiement avec Stripe demande une verification plus poussee (pas testee
cette nuit, a valider avant de considerer la migration complete).

## Ce qui est deja fait et teste (dans cette session)

- Structure du site + rendu liste/fiche produit : **teste avec un navigateur
  reel (Playwright), capture d'ecran verifiee, aucune erreur console.**
- Une piece d'exemple (`shop/data/products/exemple-sacoche.json`, en utilisant
  de vraies photos deja presentes dans ce depot) pour verifier que tout
  s'affiche correctement. A supprimer ou modifier une fois que le vrai contenu
  arrive.
- Le code de la passerelle d'authentification (`shop/oauth-worker/`, voir
  ci-dessous) est recupere et pret a etre deploye — code source verifie,
  licence MIT, pas invente.

## Ce qu'il reste a faire (etapes qui necessitent TES comptes — je ne peux pas les faire a ta place)

### 1. Autoriser les GitHub Actions a pousser des commits automatiquement

Sur GitHub : `Settings` > `Actions` > `General` > tout en bas, section
"Workflow permissions" > choisir **"Read and write permissions"** > Save.
(Sans ca, la regeneration automatique de `products.json` echouera silencieusement.)

### 2. Deployer la passerelle d'authentification (pour que l'interface d'ajout de pieces fonctionne)

Sans ca, `shop/admin/` (l'interface de gestion) ne pourra pas se connecter a
GitHub pour sauvegarder les modifications. Le code est deja pret dans
`shop/oauth-worker/` (recupere depuis un projet open-source existant,
[ottmartens/decap-cms-github-oauth-provider-cloudflare](https://github.com/ottmartens/decap-cms-github-oauth-provider-cloudflare),
licence MIT). Etapes :

1. [Creer une GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
   (gratuit) — nom libre, "Homepage URL" peut etre `https://vgthmind.github.io`,
   pas besoin de webhook. Note le **Client ID**, genere et note le **Client Secret**.
2. Créer un compte [Cloudflare](https://dash.cloudflare.com/) si tu n'en as pas
   (gratuit, le "Workers" gratuit suffit largement pour cet usage).
3. En local (ou dans une session avec terminal) :
   ```
   npm install --global wrangler
   wrangler login
   wrangler whoami
   ```
   Copier l'`account_id` affiche dans `shop/oauth-worker/wrangler.toml`
   (remplacer `COLLE_TON_ACCOUNT_ID_ICI`).
4. Dans `shop/oauth-worker/` :
   ```
   wrangler secret put CLIENT_ID
   wrangler secret put CLIENT_SECRET
   ```
   (coller les valeurs de l'etape 1 quand demande)
5. Deployer :
   ```
   cd shop/oauth-worker
   npx wrangler deploy
   ```
   Ca affiche une URL du style `https://vgthmind-decap-oauth.<ton-compte>.workers.dev`.
6. Dans `shop/admin/config.yml`, decommenter et remplir :
   ```yaml
   base_url: https://vgthmind-decap-oauth.<ton-compte>.workers.dev
   auth_endpoint: auth
   ```
   puis commit/push.

Une fois fait, `shop/admin/index.html` permettra de se connecter avec ton
compte GitHub et d'ajouter des pieces via un vrai formulaire.

### 3. Creer les liens de paiement Stripe

Pour chaque piece : dashboard Stripe > Payment Links > "+ New" > remplir
nom/prix/photo > si piece unique, activer "Limit the number of payments" a 1
> copier le lien genere > le coller dans le champ "Lien de paiement Stripe"
de la fiche produit (via l'interface une fois l'etape 2 faite, ou directement
dans le fichier JSON en attendant).

### 4. Plus tard : brancher le nom de domaine

Seulement une fois que tout est teste et valide en parallele — pointer le
domaine actuel vers GitHub Pages a la place de BigCartel. Pas urgent, a faire
en dernier, jamais avant que tu dises explicitement "oui, on bascule".

## Ce qui manque encore avant de pouvoir migrer pour de vrai

- **Export du vrai catalogue BigCartel** (photos, descriptions, prix de chaque
  piece actuelle) — je n'ai pas d'acces a l'admin BigCartel depuis cette
  session pour recuperer ca. Ce que la recherche confirme : BigCartel propose
  un export CSV natif pour les **commandes** (onglet Orders > Export CSV),
  mais pas d'export CSV natif clairement confirme pour le **catalogue produits**
  lui-meme — les outils de migration tiers (ex. LitExtension, Cart2Cart)
  recuperent generalement les produits en scannant l'URL publique de la
  boutique plutot que via un vrai export BigCartel. Le plus fiable restera
  probablement de repasser produit par produit depuis l'admin (ou via la
  conversation "Code", qui a l'acces navigateur) plutot que de compter sur un
  export en un clic.
- **Style visuel** : ce prototype a un design minimal fonctionnel, pas encore
  dans l'esthetique verre/chrome du site actuel (curseur custom, animations,
  etc.) — a faire une fois que la structure est validee, pour ne pas refaire
  le travail deux fois si l'architecture change.
- Decision finale : rester sur cette architecture "petites briques gratuites"
  (plus de travail d'assemblage, comme discute) vs. repartir sur une
  plateforme e-commerce clef en main payante (~3-5 EUR/mois, moins de travail
  de montage). Rien n'engage encore a ce stade — c'est un prototype a tester
  a froid.
