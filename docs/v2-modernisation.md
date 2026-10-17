# Variante V2 modernisée — 17 octobre 2026

Création et intégration : ChatGPT / Codex pour Localia, à la demande de Thibaut.

- V1 conservée : https://tibtibus.github.io/MSPlomberie/
- Nouvelle V2 : https://tibtibus.github.io/MSPlomberie/v2/
- Aperçu des formats : https://tibtibus.github.io/MSPlomberie/v2/apercu.html

La V2 est une variante de comparaison indépendante. Tous ses nouveaux fichiers
se trouvent dans `site/v2/`. Aucun fichier préexistant du site n’est modifié.
Elle partage les photographies et la carte existantes en lecture seule, avec des
chemins relatifs. Le processus de publication existant copie déjà ces fichiers.

## Évolution proposée

Accueil plus compact sur mobile, photos réelles mises en avant, typographie
Manrope hébergée localement, cartes de prestations cohérentes, présentation
personnelle de Sébastien et parcours de contact donnant la priorité à l’écrit.
La galerie conserve les 23 photos, leurs catégories et leurs légendes, avec
filtres, affichage progressif et visionneuse accessible au clavier.

Trois pages de prestations reprennent ce langage visuel : pompe à chaleur,
photovoltaïque et salle de bains. Les icônes sont des SVG fins ; les animations
sont sobres et respectent la préférence de réduction des mouvements.
Les textes courants sur PC sont de 18 px ; les textes secondaires de 16 px.

Le portrait de Sébastien reste à obtenir. Une photographie de sa réalisation
illustre actuellement sa présentation. L’illustration photovoltaïque est
explicitement identifiée, en l’absence de photo de chantier solaire vérifiée.
Aucun avis, badge ou numéro de qualification n’est inventé.

## Formulaire et fiche Google

Le formulaire V2 reste une démonstration, avec validation locale sans envoi.
Cette règle est indépendante d’une future activation du formulaire V1.
Les coordonnées publiques sont toujours celles de Sébastien.
Lors de la future connexion : tests uniquement vers gestion.localia@gmail.com ;
production vers msplomberie50@hotmail.com, copie gestion.localia@gmail.com.

Les URL de la fiche Google et du lien d’avis restent à créer. Le support
`v2/avis.html` utilise le QR de démonstration commun, clairement indiqué comme
tel. Le QR définitif sera généré par le build dès que l’URL d’avis sera renseignée.

## Vérifications

Après `python3 scripts/build.py`, exécuter `python3 scripts/check.py`,
`python3 scripts/check-v2.py` et `node --check site/v2/v2.js`.
Contrôler dans `v2/apercu.html` les largeurs 360, 390, 768 et 1280 px, le menu,
les filtres de galerie, la visionneuse, les liens de prestations et le formulaire.
Comparer les empreintes des fichiers V1 avant/après : aucun changement autorisé.

Manrope est distribué sous SIL Open Font License ; la licence est conservée dans
`site/v2/assets/OFL-Manrope.txt`.
