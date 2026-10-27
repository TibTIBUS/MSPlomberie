# MS Plomberie

Site de production : https://ms-plomberie-manche.fr/

## Sauvegarde du 27 octobre 2026

Le dossier `site/` conserve les fichiers publics recuperes sur la production du 27 octobre a 11h00. Il est maintenant la source statique editable. Les empreintes dans `docs/published-files-20261027.json` permettent de verifier cet etat de reference.

Les sources des deux fonctions Netlify (`chat.js` et `form-submitted.js`) ont ete recuperees depuis leurs versions et correctifs prepares pour cette publication. Leur syntaxe et le controle JWS/routage mail ont ete testes localement. Elles n'ont pas ete comparees octet par octet aux bundles executes chez Netlify.

Les anciens scripts de generation n'ont pas pu etre retablis integralement. `build.py` et `check.py` sont donc de nouveaux scripts de preparation explicitement bases sur la copie publiee, sans nouvelle generation de contenu. L'historique anterieur reste dans Git.

## Preparation locale, sans publication

Apercu protege, formulaire et assistant IA desactives, noindex et connexions bloquees :

```sh
python3 scripts/build.py
python3 scripts/check.py
```

Copie de production, identique aux 80 fichiers publics recuperes :

```sh
MSP_MODE=production python3 scripts/build.py
python3 scripts/check.py
```

La sortie est dans `dist/`. Ces commandes ne publient rien et ne font aucun appel reseau. Pour modifier le site, modifier `site/`, tester localement puis mettre a jour les empreintes apres validation de la modification. Ne jamais recopier une ancienne source V1 sur cette V2.

## Publication et configuration privee

Netlify n'est pas relie a ce depot. Le workflow GitHub Pages ne doit jamais se lancer sur un push. Toute publication est une action manuelle distincte qui demande un accord, y compris ses couts.

Les variables MISTRAL_API_KEY, RESEND_API_KEY et WEBHOOK_JWS_SECRET restent dans la configuration privee Netlify et ne sont jamais conservees dans Git. Le webhook de notification Forms doit rester limite au formulaire et signe JWS. Les destinataires ne sont pas pris depuis les champs libres du formulaire. Le routage des tests reste distinct du routage reel. Aucun test automatique ne doit envoyer de mail a l'artisan.

La copie statique seule ne remplace pas la configuration privee Netlify (variables, formulaires, webhook et domaine). Ne pas modifier ces reglages pour une simple sauvegarde de code.

Attention au formulaire : Netlify transforme le HTML lors de la publication. La copie recuperee conserve ce HTML publie. Avant une future republication, verifier les attributs de detection Netlify Forms et le formulaire cache necessaire, puis refaire un vrai test autorise. Cette sauvegarde n'autorise pas une republication sans controle.
