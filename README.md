# msplomberie — site vitrine

Maquette du site de Sébastien Mauger, artisan à Périers. Code statique sans framework, compatible GitHub Pages puis Netlify. Les photos et les deux supports corrigés sont intégrés localement, sans chargement depuis une banque d’images externe.

## Construction

```bash
python3 -m pip install -r requirements.txt
python3 scripts/build.py
```

Le résultat est dans `dist/`. Le workflow `.github/workflows/pages.yml` construit et publie la branche `main` sur GitHub Pages. Dans **Settings → Pages → Source**, choisir **GitHub Actions** si GitHub n’a pas pu activer Pages automatiquement.

Netlify : importer ce dépôt ; le fichier `netlify.toml` définit la commande et le dossier publié. Ne pas publier le répertoire `site/` directement : la construction applique les protections de la maquette.

## Contact : trois étapes distinctes

- **Maquette / GitHub Pages** : `preview`, aucun envoi et aucune collecte. Le bouton vérifie le formulaire sans transmettre. L’adresse publique affichée reste celle de Sébastien, indépendamment du mode de test.
- **Essais Netlify** : activer Forms, configurer les notifications **uniquement vers `gestion.localia@gmail.com`**, puis définir `MSP_MODE=test` et redéployer. Vérifier la réception d’un vrai test et le Reply-To.
- **Production** : après validation, routage **To: `msplomberie50@hotmail.com`**, **Cc: `gestion.localia@gmail.com`**, et `Reply-To` vers le visiteur. Les notifications natives Netlify peuvent avertir plusieurs destinataires ; une véritable en-tête Cc devra être configurée via le mécanisme d’envoi choisi, puis testée avant activation. Ne pas considérer que `MSP_MODE` configure les notifications : il ne le fait pas.

Le mode par défaut reste `preview`, même pour un déploiement Netlify appelé « production ». Ne définir `MSP_MODE=production` qu’après avoir finalisé le routage des emails et les pages légales/confidentialité. Aucune adresse destinataire n’est acceptée depuis les champs du formulaire. Photo facultative : un fichier JPG/PNG/WebP de 5 Mo maximum. Contrôle de format et de taille côté navigateur, honeypot et filtrage Netlify ; valider les exigences côté serveur avant le lancement.

## Google Business et QR code

Compléter dans `site-config.json` les liens HTTPS :

- `googleBusinessUrl` : future fiche Google ;
- `googleReviewUrl` : lien officiel « Demander des avis » fourni par la fiche Google.

Puis reconstruire. Le QR code SVG est généré localement vers ce lien exact et apparaît sur `avis.html`, avec téléchargement et impression. Tant que le lien Google est vide, un QR de démonstration mène à `demoReviewUrl`, la page explicative du site ; il porte la mention DÉMONSTRATION. Le QR de démonstration peut être téléchargé et imprimé. Aucun avis Google n’est simulé. L’invitation demande un avis sincère à tous les clients.

## Brief validé

- Nom : **msplomberie**, un seul p. Artisan : Sébastien Mauger, 14 ans dans le métier et activité créée depuis 5 ans (témoignage reçu en octobre 2026).
- Localisation : 16, cité Jean-Baptiste Pasturel, 50190 Périers. Téléphone : 07 78 81 84 21. Email : **msplomberie50@hotmail.com**.
- Priorités : pompes à chaleur et photovoltaïque. But principal : plus de demandes écrites, moins d’interruptions au téléphone.
- Autres prestations : ballons thermodynamiques, chaudières gaz, planchers chauffants, salles de bains, rénovation plomberie, évacuations, dépannage sanitaire.
- **Exclus : pose, entretien et ramonage des poêles à granulés.** Les supports utilisés sont les versions corrigées.
- Solaire : toiture en surimposition ou supports au sol, autoconsommation, batteries, dimensionnement, rentabilité, déclaration préalable en mairie. Entreprise de couverture associée pour la toiture.
- Horaires : lundi à vendredi, 8 h–12 h / 13 h 30–17 h ; fermé le week-end.
- Secteur : Manche et Calvados ; notamment Périers, Saint-Lô, Valognes et Granville.
- Membre des Chantiers de Demain : logo et lien vers la fiche de la coopérative dans la présentation et le pied de page.

## À confirmer avant lancement

Identité juridique, SIRET et mentions professionnelles ; justificatifs à jour RGE / QualiPV avec périmètres exacts ; conditions CEE / MaPrimeRénov’ et délégation de paiement ; droits de publication des photos ; conditions des devis ; liens sociaux ; description et communes des chantiers ; informations de traitement et conservation des données. Pas de promesse d’aides automatiques ni d’avis inventés.

La maquette est en `noindex` et `robots.txt` interdit l’exploration. Au lancement validé, mettre à jour ces éléments, les mentions légales et la confidentialité, ajouter l’URL canonique et le sitemap.

## Sources des visuels

Photos de chantiers et supports transmis par Thibaut pour ce projet. Versions originales conservées hors du dépôt ; versions WebP optimisées dans `site/assets/`. Logo de la coopérative fourni. Le dessin solaire est une illustration CSS explicitement identifiée et ne représente pas un chantier.

## Seconde maquette — ajustements

Le site ne prévoit plus de page Facebook. L’email public est toujours `msplomberie50@hotmail.com` ; les futurs envois de test restent destinés exclusivement à Localia. Illustration solaire et libellé séparés. Carte vectorielle animée Manche / Calvados avec départ à Périers et villes citées ; il ne s’agit ni d’une limite contractuelle de desserte ni d’un itinéraire routier. Mouvement réduit respecté.

Source du fond : [Contours administratifs Etalab / IGN 2026](https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2026/geojson/departements-1000m.geojson), Licence Ouverte. Centres des communes : [API Découpage administratif](https://geo.api.gouv.fr/). Carte dérivée locale dans `site/assets/secteur-intervention.svg`, sans chargement de cartes ou de traceurs tiers.

Pour la revue des formats, `apercu-responsive.html` affiche le site dans un cadre de 360, 390, 768 ou 1280 pixels. Cette page de contrôle est non indexable et absente de la navigation publique.
