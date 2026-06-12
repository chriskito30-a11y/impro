# Impro Vote Live — V2 modulable

Mini-site statique pour vote de public en match d'improvisation.

## Pages

- `index.html` : créer ou ouvrir une salle
- `settings.html?room=...` : régler le spectacle, les équipes, les images, la durée, les liens et les QR codes
- `admin.html?room=...` : lancer, clôturer ou réinitialiser un vote
- `vote.html?room=...` : lien public pour les spectateurs
- `screen.html?room=...` : affichage dynamique pour vidéoprojecteur

## Déploiement GitHub Pages

1. Dézipper le dossier.
2. Mettre tous les fichiers à la racine du dépôt GitHub.
3. Activer GitHub Pages : `Settings > Pages > Deploy from branch`.
4. Ouvrir `index.html` sur l'URL GitHub Pages.

## Firebase

La configuration Firebase est déjà intégrée dans `firebase-config.js`.

Dans Realtime Database > Rules, utiliser pour la V1 de test :

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    }
  }
}
```

Attention : ces règles sont ouvertes pour simplifier les tests. Le mot de passe protège l'interface côté site, mais ce n'est pas une sécurité forte contre quelqu'un qui manipule directement Firebase. Pour une version publique sérieuse, il faudra ajouter Firebase Authentication et des règles plus strictes.

## Liens et QR codes

Dans `settings.html`, chaque salle génère automatiquement :

- un lien public de vote ;
- un lien écran pour le vidéoprojecteur ;
- un lien arbitre ;
- un lien réglages.

Chaque lien est cliquable, copiable et accompagné d'un QR code automatique. Les QR codes utilisent une image générée depuis l'URL du lien ; si le service externe de QR code ne répond pas, les liens restent utilisables et copiables.

## Images

Les images ne sont pas stockées dans Firebase. Le site stocke uniquement leur URL.

Recommandations :

- Image principale : format 16:9, idéalement 1920 × 1080 px.
- Image équipe 1 / équipe 2 : format carré, idéalement 1000 × 1000 px ou plus.
- Si une image est vide ou invalide, le site continue de fonctionner sans image.
- Les coins arrondis sont appliqués automatiquement.

Tu peux utiliser un hébergeur d'image externe, puis coller le lien direct dans `settings.html`.

## Fonctionnement du vote

- Une salle correspond à un événement ou un spectacle.
- Chaque salle a son mot de passe arbitre.
- Les liens de vote et d'écran sont publics.
- L'arbitre lance un vote pour une durée définie.
- Chaque appareil peut voter une seule fois par manche.
- L'écran affiche les résultats en direct avec animation `+1`.


## PWA / installation mobile

Cette version contient les fichiers nécessaires pour transformer le site en PWA :

- `manifest.webmanifest` : nom de l'application, couleurs, mode d'affichage, icônes.
- `sw.js` : service worker pour rendre l'interface installable et garder les fichiers principaux en cache.
- `pwa.js` : enregistrement du service worker et bouton d'installation quand le navigateur le permet.
- `/icons/` : icônes PNG, favicon, icône Apple Touch et icône maskable Android.
- `offline.html` : page simple si l'app est ouverte hors connexion.

Important : les votes en direct nécessitent Internet, car Firebase Realtime Database doit rester joignable. Le mode hors ligne sert surtout à garder l'interface installable et à afficher une page propre si la connexion tombe.

### Icône

L'icône fournie est prête pour la PWA :

- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/maskable-icon-512.png`
- `icons/icon-180.png` pour iPhone/iPad
- `icons/favicon-32.png` et `icons/favicon-16.png`
- `icons/icon.svg` comme source vectorielle

### Installation

Sur Android/Chrome ou ordinateur compatible, un bouton **Installer l'app** peut apparaître sur l'accueil si le navigateur déclenche l'invite d'installation.

Sur iPhone/iPad, l'installation se fait généralement via Safari : bouton de partage, puis **Ajouter à l'écran d'accueil**.


## Crédits et CGU

Toutes les pages affichent en bas la mention :

© 2026 — Application créée par Christophe Gros - Fais Ton Show

Le lien "Fais Ton Show" mène vers https://www.faistonshow.fr.
Une page `cgu.html` contient des conditions générales d'utilisation simples pour expliquer le fonctionnement, les responsabilités, les images par URL et les données stockées dans Firebase.
