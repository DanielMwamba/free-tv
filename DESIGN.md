# FREE TV — Design

Direction : **télétexte vivant**. FREE TV est un index de diffusion instantané, pas une médiathèque. L’interface reprend la précision fonctionnelle du télétexte (pages numérotées, données denses, couleurs de signal, navigation clavier). La nostalgie reste structurelle — grille, repères, statut — jamais décorative.

La note de direction d’origine se trouve dans `.impeccable/surfaces/route.md`. Ce document fixe les décisions stables appliquées dans le code.

## Mise en page

- Bureau : index filtrable des chaînes à gauche, lecteur dominant à droite.
- Sous 900 px : lecteur en premier, index juste dessous.
- Sous 620 px : en-tête compacté, lien source en pleine largeur, bandeau défilant masqué.
- Le lecteur et les messages d’état restent dégagés ; la grille et les codes de page sont réservés à l’index.

## Couleurs

Jetons définis dans `src/app/globals.css` (`:root`). Thème sombre uniquement (`color-scheme: dark`).

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--ink` | `#050505` | Fond |
| `--paper` | `#f6f2e8` | Texte, filets principaux |
| `--cyan` | `#24d8ff` | Action, sélection, focus (`--ring`) |
| `--yellow` | `#ffd633` | Repères : numéros de page, étiquettes |
| `--red` | `#ff4d6d` | Erreurs, signal, avertissements |
| `--blue` | `#1536d8` | Bandeau d’information, code de page actif |
| `--muted-foreground` | `#c4c0b7` | Texte secondaire |
| `--border` | `#4f4d48` | Filets secondaires |

Les rayons de bordure sont tous à 0.

## Typographie

Une seule famille monospace, Azeret Mono (`next/font`, variable `--font-broadcast`), parce que l’interface est un index de données et de mesures.

## Mouvement

- Une seule animation signature : `tuning-sweep`, un balayage de syntonisation lors d’un changement de chaîne.
- `skeleton-scan` sert uniquement aux états de chargement.
- `prefers-reduced-motion: reduce` neutralise animations et défilement fluide.

## États et contenu

- Recherche, pays, chargement, erreur, vide et lien de secours sont explicites.
- Le format de chaque chaîne est affiché : HLS, YT, DM, TW, LIEN.
- Les sources HTTP sont signalées par « SOURCE HTTP » ; les lecteurs officiels par l’état « INTÉGRÉ ».
- En cas d’échec : « Réessayer » et « Ouvrir la source ».
- Attribution visible à la playlist Free-TV/IPTV et rappel que la disponibilité dépend de la source et de la région.

## Accessibilité

- Intitulés en français, `lang="fr"`.
- Focus clavier fort en cyan sur tous les contrôles.
- Cibles tactiles d’au moins 44 px.

## Risque à surveiller

Le télétexte devient un costume si chaque zone reçoit une grille ou un effet. Concentrer la forme sur l’index, les codes de page et le balayage.
