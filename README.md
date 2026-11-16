# MS Plomberie — ms-plomberie-manche.fr

Site statique hébergé sur Cloudflare Pages (depuis nov. 2026 ; auparavant Netlify).

- Pages HTML à la racine, assets dans `assets/`.
- `functions/api/chat.js` : assistant IA du site (Mistral, clé en variable d'environnement Cloudflare).
- `functions/api/contact.js` : formulaire de contact (envoi via Resend, clé en variable d'environnement).
- `_headers` : en-têtes HTTP de sécurité et cache.
- Aucune clé ni secret dans ce dépôt : tout est en variables d'environnement Cloudflare.
- Convention : un message de formulaire commençant par `[TEST-MSP]` est un essai, envoyé à contact@thibautmarie-web.fr uniquement (jamais chez le client).

Pour modifier un texte ou une photo : éditer le fichier sur GitHub puis déployer (voir avec Thibaut / Instinct).
