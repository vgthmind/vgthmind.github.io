# Prototype de boutique hors BigCartel

Ce dossier est un prototype autonome, gratuit, hors BigCartel — teste en parallele
sans rien couper ni publier sur le site actuel. Rien ici n'affecte vgthmind.bigcartel.com.

Objectif rappele (discute dans une conversation precedente) : sortir de BigCartel
en gardant Stripe (deja utilise), en gardant une interface simple pour ajouter des
pieces (proche de l'admin BigCartel, sans avoir a coder), sans payer d'hebergement
(juste le nom de domaine, comme aujourd'hui), et avec un niveau de securite
au moins aussi bon que BigCartel.

## Architecture choisie

- **Site** : pages statiques (`shop/index.html`, `shop/product.html`), hebergees
  gratuitement sur GitHub Pages (meme domaine que ce depot).
- **Gestion des pieces** : [Sveltia CMS](https://sveltiacms.app) (gratuit,
  open-source, successeur actif de Decap/Netlify CMS) — un formulaire web pour
  ajouter/modifier une piece (nom, prix, photos, description...), qui commit
  directement dans ce depot Git. Pas de base de donnees a gerer, pas de mot de
  passe a stocker nulle part.
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

**Precision utile :** la conversation precedente evoquait "un petit bout de
serveur pour les confirmations de commande" comme brique a assembler en plus.
En verifiant : ce n'est en fait **pas necessaire** pour le strict minimum —
Stripe envoie deja nativement un recu au client (a activer dans Customer
emails settings) et peut notifier le vendeur par email a chaque paiement
reussi (Personal details > notification preferences), sans code ni serveur.

**Limite honnete a garder en tete :** BigCartel gere nativement le panier
multi-articles avec frais de port combines (deja note comme un point fort
dans `bigcartel_contexte_reprise.md`). Les Payment Links Stripe sont plutot
penses "un lien = un achat" ; regrouper plusieurs pieces differentes dans un
seul paiement avec Stripe demande une verification plus poussee (pas testee,
a valider avant de considerer la migration complete).

## Securite

Contexte : un e-commerce francais s'est fait pirater recemment (mentionne par
le proprietaire), et une campagne plus large a compromis 119 sites marchands
entre juillet et septembre 2026 via des scripts espions injectes sur les
pages de paiement (vol de plus de 600 000 numeros de carte, technique dite
"Magecart" — script malveillant cache dans le code de la page ou tu tapes ton
numero de carte). Une marque francaise de streetwear (ARNtreal, ~100 000
comptes) a aussi ete piratee recemment — pas via sa plateforme e-commerce
elle-meme, mais via un systeme annexe fait maison (concours, affiliation).

### Pourquoi cette architecture resiste structurellement a ces deux scenarios

1. **Aucune page de paiement sur ce site.** Le bouton "Acheter" renvoie
   directement vers `buy.stripe.com` (page hebergee et securisee par
   Stripe — conformite PCI-DSS geree par eux, pas par nous). Aucun formulaire
   de carte bancaire n'existe jamais sur vgthmind.github.io/shop/. Un script
   malveillant injecte ici ne pourrait donc pas voler de numero de carte,
   puisqu'il n'y en a jamais sur cette page — contrairement a l'attaque de
   2026 qui ciblait des sites ou le client tape sa carte directement.
2. **Aucune base de donnees, aucun compte client, aucun systeme fait maison.**
   Tout le contenu est dans des fichiers texte (JSON) commit dans ce depot
   GitHub. Il n'y a pas de mot de passe utilisateur stocke, pas de serveur
   perso a maintenir/patcher, pas de plugin tiers a mettre a jour — donc pas
   la faille "systeme annexe mal securise" qui a touche ARNtreal.
3. **Le seul secret sensible est un jeton d'acces GitHub**, limite (voir
   ci-dessous) a ce depot uniquement, jamais partage, jamais stocke dans le
   code.

### Ce qu'il faut quand meme absolument faire (cote humain, pas du code)

- **Active la double authentification (2FA)** sur ton compte GitHub, ton
  compte Stripe, et sur ton adresse email associee. C'est la protection la
  plus efficace contre 95% des piratages de compte (vol de mot de passe
  seul). GitHub : Settings > Password and authentication > Two-factor
  authentication. Stripe : Settings > Security > Two-step authentication.
- **Ne partage jamais le jeton GitHub** (voir section Connexion ci-dessous)
  avec qui que ce soit, ne le colle jamais dans un chat, un email, un
  document partage. Si tu penses qu'il a fuite : GitHub > Settings >
  Developer settings > Fine-grained tokens > le supprimer immediatement (ca
  ne prend pas plus de 30 secondes, et ca coupe l'acces instantanement).
- **Verifie regulierement** (une fois par mois par exemple) la liste des
  connexions actives sur GitHub (Settings > Sessions) et sur Stripe, pour
  reperer une connexion suspecte.

### Connexion a l'interface de gestion des pieces (une fois configuree)

Sveltia CMS (contrairement a Decap CMS, l'option initialement envisagee)
propose une authentification par **jeton GitHub "fine-grained"**, sans avoir
besoin de deployer de serveur intermediaire :

1. Ouvrir `shop/admin/index.html` sur le site publie.
2. Cliquer sur "Sign in with token".
3. Sveltia te redirige vers GitHub, avec les bonnes permissions deja
   pre-selectionnees (acces en lecture/ecriture, **uniquement sur ce depot**
   — pas sur tes autres depots GitHub s'il y en a).
4. Generer le jeton, le copier, le coller dans Sveltia.

C'est plus simple ET plus sur que l'ancienne approche envisagee (OAuth via un
serveur Cloudflare) : un jeton "fine-grained" limite precisement a ce depot,
avec seulement la permission "Contents" (lecture/ecriture), au lieu d'un
jeton OAuth classique qui donnerait acces a TOUS tes depots GitHub. Le code
de l'ancienne approche (`shop/oauth-worker/`) reste dans le depot au cas ou
tu ajoutes un jour un collaborateur (utile seulement dans ce cas precis), mais
n'est plus l'etape recommandee pour un usage solo — inutile de le deployer.

**Sur le jeton lui-meme :** GitHub permet de fixer une date d'expiration
(recommande : 1 an maximum, jamais "sans expiration") — a renouveler quand il
expire, ca prend 1 minute. Le jeton reste stocke uniquement dans ton
navigateur (jamais sur un serveur), donc uniquement expose si quelqu'un a un
acces physique/logiciel a ton navigateur deja connecte — raison de plus pour
la 2FA sur le compte GitHub lui-meme (qui protege la creation du jeton) et de
fermer ta session sur un ordinateur partage.

### Durcissement applique dans le code (deja fait, teste)

- `shop/js/shop.js` valide chaque URL (image, lien de paiement) avant de
  l'utiliser : seules les URLs `https://` (ou chemins internes commencant par
  `/`) sont acceptees, le lien de paiement est en plus verifie comme venant
  de `buy.stripe.com`. Teste avec un payload malveillant (`javascript:...`)
  qui est correctement rejete — verifie avec un navigateur reel cette nuit.
- Le contenu texte (nom, description) est toujours insere via `textContent`,
  jamais via `innerHTML` avec des donnees variables — empeche toute injection
  de code HTML/script depuis un champ produit.
- Toutes les pages ont `<meta name="robots" content="noindex, nofollow">` —
  le prototype n'est pas indexe par les moteurs de recherche tant qu'il n'est
  pas la boutique officielle.

## Ce qui est deja fait et teste (dans cette session)

- Structure du site + rendu liste/fiche produit : **teste avec un navigateur
  reel (Playwright), capture d'ecran verifiee, aucune erreur console.**
- Une piece d'exemple (`shop/data/products/exemple-sacoche.json`, en utilisant
  de vraies photos deja presentes dans ce depot) pour verifier que tout
  s'affiche correctement. A supprimer ou modifier une fois que le vrai contenu
  arrive.
- Validation des URLs (voir section Securite) testee avec un payload
  malveillant simule — correctement bloque.
- L'ancien code de passerelle OAuth (`shop/oauth-worker/`) reste disponible
  mais n'est plus l'etape recommandee (voir section Securite / Connexion).

## Ce qu'il reste a faire (etapes qui necessitent TES comptes — je ne peux pas les faire a ta place)

### 1. Autoriser les GitHub Actions a pousser des commits automatiquement

Sur GitHub : `Settings` > `Actions` > `General` > tout en bas, section
"Workflow permissions" > choisir **"Read and write permissions"** > Save.
(Sans ca, la regeneration automatique de `products.json` echouera silencieusement.)

### 2. Activer la 2FA (securite, 5 minutes, a faire en premier)

Voir section Securite ci-dessus — GitHub et Stripe, avant tout le reste.

### 3. Se connecter a l'interface de gestion et creer les liens de paiement Stripe

- Ouvrir `shop/admin/index.html`, se connecter par jeton (voir section
  Securite / Connexion ci-dessus).
- Pour chaque piece : dashboard Stripe > Payment Links > "+ New" > remplir
  nom/prix/photo > si piece unique, activer "Limit the number of payments" a
  1 > copier le lien genere > le coller dans le champ "Lien de paiement
  Stripe" de la fiche produit, via l'interface Sveltia.

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
