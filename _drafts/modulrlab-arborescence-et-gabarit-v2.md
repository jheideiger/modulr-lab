# modulrlab.com — arborescence cible et gabarit d'une note de patch

**Version 2 · 19 septembre 2026.** Mise à jour de la v1 après l'abandon de VCV Rack, la refonte de la leçon 4 et le calendrier éditorial v2.1.

---

## 0. Ce qui a changé depuis la v1

| Point | v1 | v2 |
|---|---|---|
| Leçon 4 | TP VCV Rack | Cours magistral sur le control voltage, `/le-cours/controle-en-tension/` |
| Slugs du cours | `signal`, `harmoniques`, `modules` | Les slugs déjà publiés sont conservés : `intro`, `son-et-harmonique`, `les-modules`. Une URL publiée ne change plus. |
| Matériel d'une note | 4 colonnes, dont « Sur VCV Rack » | 3 colonnes : fonction, sur mon système, équivalent générique |
| Téléchargements | PDF + fichier `.vcv` | PDF seul. Les exercices se font sur du matériel réel. |
| Redirections | 301 | GitHub Pages ne fait pas de 301 : page de redirection (meta refresh + canonical) |
| Données structurées | `HowTo` | `VideoObject` + fil d'Ariane. Google n'affiche plus de résultat enrichi HowTo depuis le 13 septembre 2023. |
| Exemple Krell | Épisode du 3 octobre | Vidéo du samedi 17 octobre, PDF n° 1 |
| Atelier | Rubrique des patchs | Page des ateliers en présentiel et de la formation. Les patchs ont leur propre rubrique. |
| Promesse newsletter | « un patch par semaine, le schéma en PDF, et ce qui se prépare » | « un patch par semaine, et ce qui se prépare ». Le calendrier prévoit trois PDF sur le trimestre, pas un par semaine. |

---

## 1. Principe de la refonte

Le site est aujourd'hui un objet fini : quatre leçons, puis plus rien. La refonte ne change ni le design ni la technique, elle ajoute **une rubrique qui grossit chaque semaine**.

| Rubrique | Nature | Rythme |
|---|---|---|
| **le cours** | Fini, quatre leçons, ne bouge plus | Figé |
| **patchs** | Une note par vidéo publiée | Au rythme de la chaîne (mardi et samedi) |
| **outils** | Petits outils web autonomes | Un par mois |
| **histoire** | Fond éditorial existant | Ponctuel |
| **atelier** | Ateliers en présentiel et formation | Évolue avec l'offre |

Le cours attrape le débutant, les patchs le font revenir, les outils apportent des liens entrants, l'atelier convertit.

Les vidéos du pilier *Regard* (musique de film, histoire du modulaire) ne sont pas des patchs. Elles se rattachent à la rubrique histoire, ou n'ont pas de note.

---

## 2. Arborescence

```
modulrlab.com/
│
├── /                                    accueil
│
├── /le-cours/                           les fondations (fini)
│   ├── /le-cours/intro/                 leçon 1 — qu'est-ce qu'un signal
│   ├── /le-cours/son-et-harmonique/     leçon 2 — son et harmonique
│   ├── /le-cours/les-modules/           leçon 3 — panorama des modules
│   └── /le-cours/controle-en-tension/   leçon 4 — le control voltage
│
├── /patchs/                             index, filtrable par niveau et par système
│   ├── /patchs/_gabarit/                gabarit, jamais publié (dossier « _ »)
│   ├── /patchs/patch-krell/
│   ├── /patchs/nappe-ambient/
│   ├── /patchs/rythme-sans-boite-a-rythmes/
│   └── …une note par vidéo publiée
│
├── /outils/                             index des outils
│   ├── /outils/calculateur-de-rack/     HP, profondeur, consommation
│   ├── /outils/gammes-et-tensions/      conversion note ↔ volt
│   └── /outils/tirage-de-contraintes/   générateur d'exercices
│
├── /histoire/                           existant, à conserver tel quel
│
├── /atelier/                            ateliers en présentiel et formation
│
├── /newsletter/                         page d'inscription dédiée (lien des descriptions YouTube)
│
├── /a-propos/                           le manifeste
├── /contact/
├── /mentions-legales/
│
└── /en/                                 miroir intégral, même structure
```

### Navigation principale

`le cours · patchs · outils · atelier · histoire · à propos`

Contact et mentions légales descendent dans le pied de page. La navigation montre ce qui vit, pas ce qui est administratif. Une rubrique entre dans la navigation le jour où elle a du contenu.

### Règles d'URL

- Minuscules, tirets, français, jamais de numéro de leçon ni de date dans l'adresse
- Le slug d'une note est la requête visée, pas le nom poétique du patch : `/patchs/patch-krell/` et non `/patchs/glew-glew/`
- Une URL publiée ne change plus jamais. En cas de renommage, page de redirection vers la nouvelle adresse.

### La newsletter

Un champ email en ligne dans le pied de page de chaque page, et en bas de chaque note de patch, jamais un lien vers la page contact. Contrepartie sur une note : le PDF du patch.

Promesse : **un patch par semaine, et ce qui se prépare.**

---

## 3. Gabarit d'une note de patch

Chaque vidéo publiée sur YouTube produit une page construite exactement sur ce modèle. L'objectif est double : donner une raison de venir sur le site, et cibler une requête précise par page. Le gabarit HTML est dans `/patchs/_gabarit/`.

### Structure

**1 · Titre (H1)**
La même promesse que la vidéo, formulée comme une question ou un résultat. Jamais le nom du patch seul.

**2 · Chapô — trois lignes**
Ce que le patch produit, à qui il s'adresse, le temps nécessaire.

**3 · La vidéo**
Le lecteur YouTube intégré, haut de page. La page prolonge la vidéo, elle ne la remplace pas.

**4 · Ce que vous allez obtenir**
Le résultat sonore en une phrase. Niveau : débutant, intermédiaire, avancé. Durée : 20 min, 1 h. Système utilisé.

**5 · Matériel**
Trois colonnes systématiques. C'est ce qui rend la page utile à quelqu'un qui n'a pas ton rack.

| Fonction | Sur mon système | Équivalent générique |
|---|---|---|
| Source | Make Noise DPO | n'importe quel VCO |
| Enveloppe | Maths | tout générateur de fonction |

**6 · Le schéma**
Une image du patch, lisible en petit, avec les câbles numérotés.

**7 · Le câblage, étape par étape**

| # | De | Vers | Ce que ça fait |
|---|---|---|---|
| 1 | Maths ch. 1 OUT | DPO 1V/oct | fait monter et descendre la hauteur |

**8 · Réglages de départ**
Positions initiales des potentiomètres, pour que le lecteur parte du même endroit.

**9 · Ce qu'il faut écouter**
Trois points d'attention. C'est la partie pédagogique, celle qui distingue une note de patch d'une recette.

**10 · Variations**
Trois pistes concrètes pour modifier le patch.

**11 · L'exercice**
Une contrainte à réaliser seul, sur du matériel réel. C'est ce qui transforme la lecture en pratique et qui donne corps à l'idée de laboratoire annoncée sur la page d'accueil.

**12 · Téléchargement**
Le PDF du patch contre une adresse email. Le lien apparaît dès l'inscription. Unique point de capture de la page.

**13 · Pour aller plus loin**
Deux liens vers des leçons, deux vers d'autres notes. Le maillage interne est ce qui fait remonter tout le site, pas seulement la page.

---

## 4. Réglages techniques par note

- **Balise title** : 60 caractères maximum, la requête en tête
- **Meta description** : la promesse sonore, 150 caractères environ
- **Un H2 contenant le nom du module principal** : c'est un terme réellement recherché
- **Attributs alt** décrivant le schéma, pas « schéma.png »
- **Données structurées** : `VideoObject` (la vidéo intégrée) et fil d'Ariane
- **hreflang** vers la version anglaise de la même page
- Ajouter chaque nouvelle URL au `sitemap.xml`

---

## 5. Exemple appliqué

| Élément | Contenu |
|---|---|
| URL | `/patchs/patch-krell/` |
| H1 | Le patch Krell : faire jouer son modulaire tout seul |
| Title | Patch Krell expliqué : le modulaire qui s'auto-génère |
| Meta description | Le patch autonome le plus célèbre du modulaire, expliqué câble par câble, avec le schéma en PDF. |
| Vidéo | Samedi 17 octobre 2026 |
| Niveau | Débutant avancé · 30 min |
| Modules | Maths, DPO, MMG, Wogglebug (liste à confirmer au tournage), équivalents génériques fournis |
| Exercice | Refaire le patch en remplaçant le hasard par une séquence fixe, et écouter ce qu'on perd |
| Téléchargement | `patch-krell.pdf` (PDF n° 1) |

---

## 6. Ordre d'exécution et état au 19 septembre

| # | Étape | État |
|---|---|---|
| 1 | Champ email en ligne dans le pied de page, promesse réécrite | **Fait** sur les 32 pages FR et EN, plus une page `/newsletter/` |
| 2 | Création de `/patchs/` et de la première note, qui sert de gabarit | **Index et gabarit prêts.** `/patchs/` est en ligne mais non indexé ; la première note attend la première vidéo. |
| 3 | Ajout de la rubrique dans la navigation principale | Le jour de la première note. Contact est déjà descendu dans le pied de page. |
| 4 | Accueil : quatre leçons, bloc « derniers patchs » | **Quatre leçons : fait.** Le bloc « derniers patchs » arrive avec les premières notes. |
| 5 | Première page d'outil, puis une par mois | Octobre : calculateur de rack |
| 6 | Réécriture de `/atelier/` en page commerciale le jour où l'offre existe | La page annonce désormais des ateliers en présentiel « en préparation » |

Les points 1 et 2 valent à eux seuls plus que tout le reste. Tant que la capture email passait par un formulaire de contact, chaque visiteur gagné était perdu.
