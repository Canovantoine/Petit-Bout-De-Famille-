# Charte graphique — Petit Bout de Famille

Charte établie à partir des modules déjà produits (PDF du dossier Drive « Formation petit bout de famille »), en particulier **Bébé 1 « Préparer l'arrivée de bébé »**, qui sert de référence de mise en page. Les modules ont été générés en HTML puis exportés en PDF A4 (Chromium).

---

## 1. Esprit de la marque

- **Doux, chaleureux, rassurant.** Des tons crème, pêche et miel, jamais de blanc clinique ni de couleurs criardes.
- **Rond et enfantin sans être bébé.** Typographie arrondie, coins arrondis partout, pictos simples à gros trait.
- **Clair et pratique.** Beaucoup d'air, des cartes, des tableaux, des listes à cocher. On doit pouvoir lire une page en 30 secondes.
- **Ton** : on vouvoie le parent, on part de sa question (« Mon bébé ne se retourne pas encore : est-il en retard ? »), on rassure, on ne culpabilise jamais.

---

## 2. Couleurs

### Palette principale (commune à tous les modules)

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Fond de page | Crème | `#FFF4E8` | Fond de toutes les pages (≈ 50-60 % de la surface) |
| Surface | Blanc | `#FFFFFF` | Cartes, lignes de tableau, cases à cocher |
| Texte | Brun chocolat | `#3D2B1F` | Titres, texte courant, encadrés sombres, contour des pictos |
| Accent principal | Terracotta | `#B9502C` | Mot-clé du titre, badges, numéros de page, en-têtes de tableau, liens |
| Accent foncé | Brique | `#8A3A1F` | Encadré d'urgence « 15 », textes d'accent sur fond clair |
| Surface 1 | Pêche | `#FCD9C4` | Grands cercles décoratifs, cartes, encadré de la question |
| Surface 2 | Miel pâle | `#FBE3A1` | Cartes, encadré « fiches pratiques », cercles décoratifs |
| Surface 3 | Rose poudré | `#F8D5CF` | Cartes, encadrés « pour vous, parents » |
| Highlight | Jaune soleil | `#F9C74F` | Titre et badge des encadrés sombres (« Le conseil de pro », « L'espace du kiné »), étoile, lune |
| Highlight 2 | Abricot | `#F6B48A` | Remplissage des pictos (cœur, lune), petits détails |

### Couleurs d'accent (organisation en 10 modules, validée)

La palette de base ne change pas ; seul l'accent (badge, mot-clé du titre, cercle principal, numéros de page) change.

| Contenu | Accent | Surface associée |
|---|---|---|
| **Toute la formation** (couvertures de module, chapitres sur l'enfant) | Terracotta `#B9502C` | Pêche `#FCD9C4` |
| **Leçons « Vous, les parents »** : corps de la mère (grossesse, post-partum, périnée, allaitement, reprise du sport) | Framboise `#9E3D57` | Rose poudré `#F8D5CF` |
| **Leçons « Vous, les parents »** : les deux parents (couple, moral, place du partenaire, organisation, travail) | Bleu canard `#2E6670` | Bleu brume `#D6E8EA` |

Le parent repère ainsi d'un coup d'œil les leçons qui parlent de lui plutôt que de l'enfant, sans revenir à des parcours « Maman » et « Papa » séparés. Dans une leçon qui couvre les deux sujets, prendre la couleur du sujet principal.

Historique : dans les anciens modules, la framboise marquait le parcours Maman et le bleu canard le parcours Papa.

### Règles

- Texte toujours en brun `#3D2B1F` (jamais de noir pur), sauf sur fond sombre où il passe en blanc ou crème.
- Une page = le fond crème + 2 ou 3 couleurs de surface au maximum + l'accent.
- Les cartes alternent pêche / miel / rose / blanc pour rythmer la page.

---

## 3. Typographie

Les deux polices sont gratuites sur Google Fonts.

| Rôle | Police | Graisse | Exemple |
|---|---|---|---|
| Titres (couverture, titres de page, titres de carte) | **Fredoka** | Bold / SemiBold | « Préparer l'arrivée de **bébé** » |
| Texte courant | **Nunito** | Regular | Paragraphes, listes, tableaux |
| Mise en avant dans le texte | Nunito | Bold / ExtraBold | « un **couchage sûr** » |
| Citation de la question | Nunito | Italique / SemiBold Italique | « *Qu'est-ce qu'il faut vraiment acheter ?* » |
| Surtitre de page, badges | Nunito | ExtraBold, MAJUSCULES, lettrage espacé | `MODULE 1 · PRÉPARER L'ARRIVÉE DE BÉBÉ` |

### Hiérarchie (repères mesurés sur les PDF A4)

| Élément | Taille approx. | Style |
|---|---|---|
| Titre de couverture | 44-48 pt | Fredoka Bold, brun, dernier mot en couleur d'accent, 3 lignes max |
| Titre de page | 24-26 pt | Fredoka Bold, brun |
| Titre de carte / section | 12-14 pt | Fredoka SemiBold, brun |
| Texte courant | 9-10 pt | Nunito Regular, interligne aéré (≈ 1,6) |
| Surtitre de page | 7 pt | Nunito ExtraBold, majuscules, espacé |
| Pied de page | 7 pt | Nunito, brun clair |

Import web :

```html
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
```

---

## 4. Éléments graphiques

### Formes décoratives
- **Grands cercles** pêche, miel ou rose qui débordent des bords de la page (en haut à droite surtout, parfois en bas à gauche). Ils ne passent jamais sous le texte.
- **Cercle en pointillés** terracotta (ou couleur du parcours), vide, comme petit détail de couverture.
- **Petits cercles pleins** miel ou rose en accompagnement des grands.

### Pictogrammes et illustrations
- Style **dessin simple à gros trait brun** (`#3D2B1F`), remplissage plein en jaune soleil, abricot ou pêche : étoile, lune, cœur, soleil, voiture, sac de courses, nuage.
- Un picto par page de contenu, en haut à droite, à côté du titre.
- Couverture : petite illustration (ex. **mobile de bébé** avec étoile, lune et nuage suspendus en fils pointillés terracotta).
- Icônes fonctionnelles (panier, lit, voiture, maison, téléphone, ampoule, point d'exclamation) : trait fin terracotta dans une pastille ronde miel ou pêche.
- **Pas de photos** dans les modules actuels : tout est en vectoriel. Si des photos sont ajoutées plus tard (site, réseaux), privilégier des tons chauds et une lumière douce.

### Formes des blocs
- Coins arrondis partout (≈ 12-16 px pour les cartes, pilule pour les badges).
- Pas de bordures dures ni d'ombres portées marquées : les blocs se distinguent par leur couleur de fond.

---

## 5. Composants de mise en page

| Composant | Description |
|---|---|
| **Badge module** | Pilule terracotta, texte blanc majuscules : `MODULE 1`, `FICHE PRATIQUE 2`. Suivi éventuellement d'un sous-titre en brun (« Bébé de 0 à 3 ans »). |
| **Couverture** | Badge → titre géant (dernier mot en accent) → question en italique → illustration → bloc « Dans ce module » : 4 cartes pilule (pêche, miel, rose, blanc) en grille 2 × 2. |
| **Surtitre de page** | `MODULE X · TITRE DU MODULE` en petites majuscules espacées, en haut à gauche. |
| **Encadré question** | Carte pêche pleine largeur, icône « ? » terracotta + question en Fredoka. |
| **Objectifs « À la fin de ce module, vous saurez »** | 4 cartes blanches en grille 2 × 2, chacune avec une pastille-icône. |
| **Cartes de contenu** | Titre Fredoka + texte court, fonds pêche / miel / rose / blanc en alternance. |
| **Règles numérotées** | Grille 2 colonnes, numéro dans un rond terracotta, titre en gras, une ligne d'explication. |
| **Tableau** | Première colonne en cartes terracotta texte blanc, cellules pêche (indispensable) et blanches (secondaire). Tableaux simples : en-tête pêche, lignes blanches. |
| **Encadré sombre « Le conseil de pro » / « L'espace du kiné »** | Fond brun `#3D2B1F`, titre jaune soleil `#F9C74F`, badge jaune `L'ESPACE DU KINÉ`, texte crème. C'est la **signature kiné** de la formation. |
| **Encadré « À retenir »** | Fond blanc, bordure terracotta fine, icône d'alerte, phrase clé en gras. |
| **Encadré urgence** | Fond brique `#8A3A1F`, gros « 15 » dans un rond blanc (« ou le 112 »), liste à puces blanche. |
| **Colonnes Avant / Après** | En-têtes pilule terracotta et brun, cartes pêche à gauche et miel à droite. |
| **Fiche pratique** | En-tête coloré arrondi (pêche ou miel) avec badge + titre + picto, puis liste de cases à cocher (carrés arrondis à bord terracotta) dans des lignes blanches. Encadré final rose avec un message d'encouragement. |
| **Numéros utiles** | Carte blanche, lignes pointillées à remplir. |
| **Bloc « Dans le prochain module »** | Carte terracotta, surtitre majuscules, titre Fredoka blanc, question en italique. |
| **Pied de page** | « Petit Bout de Famille » à gauche ; numéro de page dans un rond terracotta à droite (ou « Source : … » quand la page cite une source). |

### Déroulé type d'un module complet
1. Couverture
2. Introduction (question, contexte, objectifs)
3. 3 à 5 pages de contenu (une notion par page)
4. « Quand consulter / Quand demander de l'aide »
5. Fiches pratiques à imprimer et à cocher
6. Sources et avertissement + « Dans le prochain module »

---

## 6. Points à corriger dans les modules existants

Les 22 modules au format court (créés le 14/10) reprennent la charte, mais présentent des défauts à corriger lors de la mise en page finale :

- Le badge de couverture est **coupé en haut de page**.
- Certains encadrés sont **coupés au changement de page** (ex. « L'espace du kiné » dans Bébé 7, « La culpabilité » dans Maman 3).
- Le pied de page utilise une police de secours (**Liberation Sans**) au lieu de Nunito.
- Polices exportées en Type 3 : texte moins net et moins bien copiable. Exporter avec les polices TrueType intégrées, comme Bébé 1.
- Le sous-titre « Bébé de 0 à 3 ans » est à mettre à jour selon la nouvelle organisation par modules.

---

## 7. Variables CSS de référence

```css
:root {
  /* Fonds */
  --creme:        #FFF4E8;
  --blanc:        #FFFFFF;
  /* Texte */
  --brun:         #3D2B1F;
  /* Accents */
  --terracotta:   #B9502C;
  --brique:       #8A3A1F;
  --soleil:       #F9C74F;
  --abricot:      #F6B48A;
  /* Surfaces */
  --peche:        #FCD9C4;
  --miel:         #FBE3A1;
  --rose:         #F8D5CF;
  /* Accents des leçons « Vous, les parents » */
  --framboise:    #9E3D57;
  --canard:       #2E6670;
  --brume:        #D6E8EA;

  --font-titre:   'Fredoka', sans-serif;
  --font-texte:   'Nunito', sans-serif;
  --radius-carte: 14px;
  --radius-pill:  999px;
}
```
