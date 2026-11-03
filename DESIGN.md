# FREE TV — Design

Direction : **guide TV en direct, sobre**. L’interface s’inspire des services de télévision linéaire gratuite (Pluto TV, Samsung TV Plus) : le lecteur domine, un guide des chaînes reste toujours à portée, et l’habillage s’efface derrière les images. Aucune décoration ne doit concurrencer la vidéo.

La note de direction `.impeccable/surfaces/route.md` résume la même direction ; ce document fixe les décisions appliquées dans le code.

## Mise en page

- Barre supérieure collante de 64 px : marque, navigation (Chaînes, État, Source).
- Bureau (≥ 1024 px) : lecteur 16:9 à gauche, collant ; guide des chaînes à droite (`clamp(340px, 28vw, 460px)`), défilant dans sa propre colonne.
- Sous 1024 px : une seule colonne, lecteur d’abord, guide ensuite.
- Sous 640 px : lecteur bord à bord, sans arrondi ; libellés de navigation masqués (icônes seules, avec nom accessible).
- Au-delà de 1800 px (téléviseurs) : taille de base portée à 18 px.
- Le guide affiche les chaînes par lots de 80 avec « Afficher plus », au lieu d’une limite fixe.

## Couleurs

Jetons définis dans `src/app/globals.css` (`:root`) et reliés aux variables shadcn. Thème sombre uniquement (`color-scheme: dark`).

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--bg` | `#0b0d12` | Fond de page |
| `--surface` | `#12151c` | Panneau du guide |
| `--surface-2` | `#1a1e27` | Champs, survol, badges |
| `--surface-3` | `#242a36` | Ligne active |
| `--line` | `#262b36` | Filets |
| `--text` | `#eceef3` | Texte principal |
| `--text-muted` | `#a1a9b8` | Texte secondaire |
| `--text-faint` | `#7a8293` | Numéros, mentions |
| `--brand` / `--brand-strong` | `#4f8cff` / `#78a6ff` | Action principale, sélection, focus |
| `--live` | `#f25555` | Badge « En direct » uniquement |
| `--warn` | `#f2b134` | Restriction régionale, alertes de lecture |
| `--ok` | `#3ccf7a` | Disponibilité confirmée |

Rayons : 8 px (contrôles), 10 px (lignes, champs), 12–14 px (lecteur, guide).

## Typographie

Inter (`next/font`, variable `--font-app`), graisses 500 à 700. Les numéros de chaîne utilisent les chiffres tabulaires.

## Composants

- **Ligne de chaîne** : logo 44 px (initiales si le logo manque, échoue ou n’est pas en HTTPS), nom, numéro · pays, étiquettes discrètes (« Région », plateforme intégrée). La ligne active porte un fond plus clair et un filet d’accent à gauche.
- **Bandeau de lecture** : logo 56 px, nom, badge « En direct », numéro, pays, badges de restriction, SD ou source HTTP.
- **Guide des programmes** : sous les métadonnées du bandeau, deux lignes « En ce moment » / « Ensuite » avec une étiquette en petites capitales, le titre (tronqué) et l’horaire en chiffres tabulaires ; le programme en cours porte une barre d’avancement de 3 px à la couleur d’accent. Rien n’est affiché sans guide.
- **Choix de qualité et de piste audio** : listes natives compactes dans le bandeau de lecture, affichées seulement quand le flux propose au moins deux choix.
- **Mode TV** : plein écran du lecteur (`F`). Le bandeau de lecture devient une incrustation en dégradé en haut de l’image, laissant les commandes natives en bas ; il s’efface avec le curseur après 3,5 s sans activité et revient au moindre geste ou changement de chaîne. Le numéro composé s’affiche en grand au centre.
- **Image dans l’image, Diffuser, Mode TV** : boutons icône de 40 px avec nom accessible et infobulle ; « Diffuser » n’est rendu que si un appareil est disponible.
- **Puces de catégorie** : pilules de 32 px défilant horizontalement sans barre visible ; la puce active passe en texte sombre sur fond clair, comme les rangées de genres des plateformes de télévision gratuite.
- **Pastille de disponibilité** : point de 8 px devant le numéro (vert en ligne, orange refusé dans le pays du serveur, rouge injoignable), doublé d’un texte pour les lecteurs d’écran.
- **Interrupteur « Disponibles maintenant »** : case native masquée et piste visuelle, avec l’avancement du contrôle à droite.
- **Page État** : quatre cartes de synthèse puis un tableau par pays avec une jauge de disponibilité.
- **Boutons** : base shadcn, hauteur 40 px par défaut (44 px en `lg`).

## Mouvement

- Indicateur de chargement circulaire dans le lecteur, squelettes scintillants dans le guide.
- `prefers-reduced-motion: reduce` neutralise toutes les animations.

## États et contenu

- Chargement, catalogue indisponible, recherche vide, échec de lecture et restriction régionale ont chacun un message et une action (« Recharger », « Effacer les filtres », « Réessayer », « Ouvrir la source »).
- Sous un lecteur officiel intégré, un lien « ouvrir sur la plateforme » reste affiché, car l’iframe ne signale pas ses échecs.
- Rappel en pied de page : FREE TV n’héberge aucun flux.

## Accessibilité

- Intitulés en français, `lang="fr"`.
- Contour de focus de 2 px en `--brand-strong` sur tous les contrôles.
- Cibles tactiles d’au moins 40–44 px ; la ligne active expose `aria-current`.
- `/` place le focus dans la recherche.
- `Page ↓` / `Page ↑` (et les touches chaîne d’une télécommande) zappent dans la liste affichée ; les chiffres composent un numéro, confirmé par `Entrée` ou après 1,5 s. Un bandeau (OSD) annonce la chaîne via `role="status"`. Ces raccourcis sont ignorés pendant la saisie dans un champ.
- `F` bascule le mode TV (ignoré pendant une saisie) ; `Échap` le quitte.
- « Partager » utilise le partage natif, sinon le presse-papiers.
