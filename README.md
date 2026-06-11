# Impro Vote

Mini site statique pour vote de public en théâtre d'improvisation.

## Pages

- `index.html` : accueil avec les liens
- `admin.html` : page arbitre pour lancer, clore et réinitialiser le vote
- `vote.html` : page public à partager par lien ou QR code
- `screen.html` : écran de résultats dynamique

## Déploiement GitHub Pages

1. Crée un dépôt GitHub.
2. Envoie tous les fichiers à la racine du dépôt.
3. Va dans `Settings` > `Pages`.
4. Source : `Deploy from a branch`.
5. Branche : `main`, dossier `/root`.
6. Ouvre l'URL GitHub Pages.

## Firebase

Le fichier `firebase-config.js` contient déjà la configuration Web Firebase du projet `impro-ead69`.

Dans Firebase Console > Realtime Database > Rules, utilise au minimum pour les tests :

```json
{
  "rules": {
    "improVote": {
      ".read": true,
      ".write": true
    }
  }
}
```

## Utilisation

1. Ouvre `admin.html` sur l'appareil de l'arbitre.
2. Ouvre `screen.html` sur l'ordinateur relié au vidéoprojecteur.
3. Partage `vote.html` au public, par exemple via QR code.
4. Dans `admin.html`, modifie les deux équipes et la durée, puis clique sur `Lancer le vote`.

Chaque appareil peut voter une seule fois par improvisation. Le vote est mémorisé dans le navigateur avec `localStorage`.

## Note sécurité

Cette V1 est volontairement très simple, sans compte et sans mot de passe. Les règles ouvertes sont pratiques pour tester, mais elles permettent techniquement à quelqu'un qui connaît la base d'écrire dans `/improVote`.

Pour un usage public plus sécurisé, il faudra ajouter une petite protection côté arbitre, par exemple un code admin ou Firebase Auth.
