# JEP Planner

Webapp 100% frontend (aucun backend) pour planifier son week-end des Journées Européennes du Patrimoine : rechercher des événements, choisir un créneau horaire précis dans les plages d'ouverture réelles, et construire un planning personnel — le tout stocké en local dans le navigateur.

Installable comme PWA sur mobile.

## Source des données

[API OpenAgenda](https://developers.openagenda.com/), agenda officiel des JEP (`uid=2883956`). Contrairement au CSV publié sur data.gouv.fr (disponible seulement le jour de l'événement), cette API contient déjà le programme des semaines à l'avance.

## Développement local

```bash
npm install
cp .env.example .env.local   # renseigner VITE_OPENAGENDA_KEY (clé publique gratuite sur openagenda.com)
npm run dev
```

## Déploiement (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` build et publie automatiquement à chaque push sur `main`.

Réglages nécessaires côté GitHub, une seule fois :

1. `Settings → Pages → Source` : choisir **GitHub Actions**.
2. `Settings → Secrets and variables → Actions` : ajouter un secret `OPENAGENDA_KEY` avec la clé API.
3. Si le dépôt ne s'appelle pas `guide-jep`, adapter le `base` dans `vite.config.ts`.

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + Zustand (état persisté en `localStorage`) + `vite-plugin-pwa`.
