---
version: 1
slug: "route"
primary_target: "route:/"
related_targets: []
---

# FREE TV — Télétexte vivant

## Direction

FREE TV est un index de diffusion instantané, pas une médiathèque. L’interface reprend la précision fonctionnelle du télétexte : pages numérotées, données denses, couleurs de signal et navigation clavier. La nostalgie reste structurelle — grille, repères, statut — jamais décorative.

## Première vue

- À gauche : index filtrable des chaînes et des pays, numéros de page visibles, état HLS ou source externe.
- À droite : grand lecteur toujours prioritaire, chaîne sélectionnée, pays et état de syntonisation.
- Sur petit écran : lecteur en premier, index immédiatement dessous, filtres horizontaux accessibles.

## Monde visuel

- Fond noir véritable `#050505`, texte ivoire `#f6f2e8`.
- Cyan `#24d8ff` pour l’action et le focus, jaune `#ffd633` pour les repères, rouge `#ff4d6d` pour les erreurs.
- Grille de caractères et mosaïque de blocs utilisées pour aligner l’information, pas comme texture gratuite.
- Une seule animation signature : balayage de syntonisation lors d’un changement de chaîne.
- Typographie monospace parce que l’interface est un index de données et de mesures.

## États et contenu

- Recherche, pays, disponibilité, chargement, erreur, vide et lien de secours sont explicites.
- Les flux HTTP non sécurisés et les plateformes non intégrables sont signalés avant lecture.
- Les contrôles ont des intitulés français, un focus clavier fort et des cibles tactiles d’au moins 44 px.
- Attribution visible à la playlist Free-TV/IPTV et rappel que la disponibilité dépend de la source et de la région.

## Risque à surveiller

Le télétexte devient un costume si chaque zone reçoit une grille ou un effet. Concentrer la forme sur l’index, les codes de page et le balayage; laisser le lecteur et les messages respirer.
