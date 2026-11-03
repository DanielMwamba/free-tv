# FREE TV

Application web personnelle pour parcourir et lire les chaînes publiques référencées par [Free-TV/IPTV](https://github.com/Free-TV/IPTV), sans passer par VLC.

## Stack

- Next.js 16 et React 19
- TypeScript strict
- Tailwind CSS 4 et shadcn/ui
- `hls.js` avec repli HLS natif
- pnpm

## Démarrage

Prérequis : Node.js 20.9 ou plus récent et pnpm.

```bash
pnpm install
pnpm dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

## Vérifications

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Lecture des flux

Les manifestes HLS sont lus via `/api/stream`. Ce relais même origine réécrit les sous-playlists, segments et clés afin d’éviter les blocages CORS/CORP des navigateurs. Il n’accepte que les hôtes provenant du catalogue ou découverts dans un manifeste autorisé, refuse les adresses privées et ne contourne ni authentification, ni DRM, ni géoblocage.

Les chaînes dont la source est en HTTP passent aussi par ce relais : le navigateur reçoit le flux en même origine, sans contenu mixte, mais le trajet entre le serveur FREE TV et le diffuseur n’est pas chiffré. Le lecteur les signale avec l’étiquette « SOURCE HTTP ».

Les chaînes YouTube, Dailymotion et Twitch s’ouvrent dans le lecteur officiel de chaque plateforme. YouTube n’est intégrable que pour les liens contenant un identifiant de vidéo (`watch?v=`, `youtu.be`) ou de chaîne (`/channel/UC…`) ; les pages `/@nom`, `/c/nom` ou `/user/nom` restent accessibles via « Ouvrir la source ».

Une chaîne peut encore échouer si son URL est obsolète, si son codec n’est pas pris en charge, si elle est limitée à une région ou si le diffuseur applique un challenge anti-bot. Dans ce cas, l’interface propose de réessayer ou d’ouvrir la source officielle.

FREE TV n’héberge aucun contenu vidéo. Les flux, droits et conditions de disponibilité restent sous la responsabilité de leurs diffuseurs.
