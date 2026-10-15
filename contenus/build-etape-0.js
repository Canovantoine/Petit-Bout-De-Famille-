// Génère contenus/Etape-0-Avant-la-naissance.docx
// Usage : node contenus/build-etape-0.js
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, HeadingLevel, LevelFormat, PageBreak,
  Footer, PageNumber, TableOfContents,
} = require('docx');

// ---------- Charte ----------
const C = {
  brun: '3D2B1F', terracotta: 'B9502C', brique: '8A3A1F', soleil: 'F9C74F',
  peche: 'FCD9C4', miel: 'FBE3A1', rose: 'F8D5CF', creme: 'FFF4E8', blanc: 'FFFFFF',
  framboise: '9E3D57', canard: '2E6670', brume: 'D6E8EA',
};
const TITRE = 'Fredoka';
const TEXTE = 'Nunito';
const W = 9638; // largeur utile A4 avec marges de 2 cm (DXA)

// ---------- Helpers ----------
// Texte avec **gras**
function runs(text, opts = {}) {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part =>
    part.startsWith('**')
      ? new TextRun({ text: part.slice(2, -2), bold: true, font: TEXTE, color: opts.color || C.brun, size: opts.size })
      : new TextRun({ text: part, font: TEXTE, color: opts.color || C.brun, italics: opts.italics, size: opts.size })
  );
}
const p = (text, opts = {}) => new Paragraph({ children: runs(text, opts), spacing: { after: 120, line: 300 }, ...opts.para });
const bullets = (items, opts = {}) => items.map(t => new Paragraph({
  children: runs(t, opts), numbering: { reference: 'puces', level: 0 }, spacing: { after: 60, line: 290 },
}));
const numbered = (items, ref) => items.map(t => new Paragraph({
  children: runs(t), numbering: { reference: ref, level: 0 }, spacing: { after: 60, line: 290 },
}));
const h1 = (text, color = C.brun) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: TITRE, bold: true, color, size: 40 })], spacing: { before: 0, after: 160 } });
const h2 = (text, color = C.brun) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: TITRE, bold: true, color, size: 28 })], spacing: { before: 300, after: 120 }, keepNext: true });
const h3 = (text, color = C.brun) => new Paragraph({ children: [new TextRun({ text, font: TITRE, bold: true, color, size: 23 })], spacing: { before: 180, after: 80 }, keepNext: true });
const kicker = (text, color = C.terracotta, brk = false) => new Paragraph({ pageBreakBefore: brk, children: [new TextRun({ text: text.toUpperCase(), font: TEXTE, bold: true, color, size: 16, characterSpacing: 40 })], spacing: { after: 120 } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer = () => new Paragraph({ children: [], spacing: { after: 80 } });

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

// Encadré coloré (tableau 1 cellule)
function callout({ label, title, body = [], list = [], fill = C.peche, titleColor = C.brun, textColor = C.brun, border }) {
  const children = [];
  if (label) children.push(new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), font: TEXTE, bold: true, size: 15, color: titleColor === C.soleil ? C.soleil : titleColor, characterSpacing: 40 })], spacing: { after: 60 } }));
  if (title) children.push(new Paragraph({ children: [new TextRun({ text: title, font: TITRE, bold: true, size: 24, color: titleColor })], spacing: { after: 80 } }));
  body.forEach(t => children.push(new Paragraph({ children: runs(t, { color: textColor }), spacing: { after: 80, line: 290 } })));
  list.forEach(t => children.push(new Paragraph({ children: runs(t, { color: textColor }), numbering: { reference: 'puces', level: 0 }, spacing: { after: 40, line: 280 } })));
  const b = border ? { style: BorderStyle.SINGLE, size: 8, color: border } : noBorder;
  return [new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill },
      margins: { top: 160, bottom: 120, left: 240, right: 240 },
      children,
    })] })],
  }), spacer()];
}
const question = (q, fill = C.peche) => callout({ title: `« ${q} »`, fill });
const kine = (title, body, list) => callout({ label: "L'espace du kiné", title, body, list, fill: C.brun, titleColor: C.soleil, textColor: C.creme });
const retenir = (items) => callout({ label: 'À retenir', list: items, fill: C.blanc, titleColor: C.terracotta, border: C.terracotta });
const alerte = (title, items) => callout({ title, list: items, fill: C.brique, titleColor: C.blanc, textColor: C.blanc });
const note = (t) => callout({ label: 'Note de production', body: [t], fill: C.miel });

// Tableau de données
function table(headers, rows, widths, head = C.terracotta) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (text, w, opts = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill || C.blanc },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: runs(text, { color: opts.color || C.brun, size: 19 }), spacing: { line: 270 } })],
  });
  const line = { style: BorderStyle.SINGLE, size: 4, color: C.peche };
  return [new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    borders: { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(`**${h}**`, widths[i], { fill: head, color: C.blanc })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(i === 0 ? `**${t}**` : t, widths[i], { fill: i === 0 ? (ri % 2 ? C.miel : C.peche) : C.blanc })) })),
    ],
  }), spacer()];
}

// En-tête de leçon
function lecon({ num, titre, q, objectifs, format, accent = C.terracotta, surface = C.peche, parents }) {
  const out = [];
  if (parents) out.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: '  VOUS, LES PARENTS  ', font: TEXTE, bold: true, size: 16, color: C.blanc, shading: { type: ShadingType.CLEAR, color: 'auto', fill: accent } })], spacing: { after: 120 } }));
  out.push(kicker(`Étape 0 · Avant la naissance · Leçon ${num}`, accent, !parents));
  out.push(h1(titre));
  out.push(...question(q, surface));
  out.push(h3('À la fin de cette leçon, le parent saura', accent));
  out.push(...bullets(objectifs));
  out.push(p(`**Format suggéré :** ${format}`, { para: { spacing: { before: 120, after: 200 } } }));
  return out;
}

// ---------- Contenu ----------
const content = [];

// Couverture
content.push(
  new Paragraph({ children: [new TextRun({ text: '  ÉTAPE 0  ', font: TEXTE, bold: true, size: 20, color: C.blanc, shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.terracotta } }), new TextRun({ text: '   Pendant la grossesse', font: TEXTE, bold: true, size: 20, color: C.brun })], spacing: { before: 1800, after: 400 } }),
  new Paragraph({ children: [new TextRun({ text: 'Avant la ', font: TITRE, bold: true, size: 88, color: C.brun }), new TextRun({ text: 'naissance', font: TITRE, bold: true, size: 88, color: C.terracotta })], spacing: { after: 300 } }),
  new Paragraph({ children: [new TextRun({ text: '« Mon test est positif ! Qu’est-ce que je dois faire ? »', font: TEXTE, italics: true, size: 30, color: C.brun })], spacing: { after: 900 } }),
  p('**Contenus des 10 leçons — document de travail**', { size: 24 }),
  p('Petit Bout de Famille · Formation de la grossesse aux 6 ans'),
  spacer(),
  ...callout({
    label: 'Mode d’emploi', fill: C.miel,
    body: [
      'Ce document rassemble **toutes les informations à mettre dans chaque leçon** de l’étape 0. Il sert de base pour écrire les scripts vidéo, mettre en page les PDF dans la charte graphique et créer les leçons sur systeme.io.',
      'Chaque leçon suit la même structure : la question-accroche, les objectifs, le contenu, l’encadré « L’espace du kiné » quand il est utile, « À retenir », puis les supports à produire.',
      'Les encadrés jaunes « Note de production » sont des consignes internes : ils ne doivent pas apparaître dans la version vendue.',
    ],
  }),
  ...callout({
    label: 'Avant la vente', fill: C.rose,
    body: ['Toutes les informations médicales, réglementaires et administratives de ce document sont à **faire relire par une sage-femme ou un gynécologue-obstétricien**, et les droits (congés, aides CAF) à vérifier sur service-public.fr et ameli.fr au moment de la publication : ils changent régulièrement.'],
  }),
);

// Sommaire
content.push(
  kicker('Sommaire', C.terracotta, true),
  h1('Les 10 leçons de l’étape 0'),
  ...table(['Leçon', 'Titre', 'Couleur'], [
    ['1', 'Son développement dans le ventre', 'Terracotta'],
    ['2', 'Les premières démarches', 'Terracotta'],
    ['3', 'Les rendez-vous et examens', 'Terracotta'],
    ['4', 'Mon corps change, trimestre par trimestre', 'Framboise (Vous, les parents)'],
    ['5', 'Bébé grandit dans le ventre, mois par mois', 'Terracotta'],
    ['6', 'Ce que je mange, ce que j’évite', 'Framboise (Vous, les parents)'],
    ['7', 'Préparer la naissance', 'Terracotta'],
    ['8', 'Préparer la maison et la valise', 'Terracotta'],
    ['9', 'Le couple et l’organisation', 'Bleu canard (Vous, les parents)'],
    ['10', 'Quand consulter et fiches à imprimer', 'Terracotta'],
  ], [1000, 5638, 3000]),
  ...callout({
    label: 'Repère important pour toute l’étape', title: 'Semaines d’aménorrhée (SA) ou semaines de grossesse ?', fill: C.peche,
    body: [
      'Les professionnels comptent en **semaines d’aménorrhée (SA)**, à partir du premier jour des dernières règles. La grossesse dure environ **41 SA**, soit 39 semaines de grossesse ou 9 mois.',
      'Pour passer des SA aux semaines de grossesse, on enlève 2 semaines. Dans toute la formation, on donne les repères en SA (ceux du carnet et des comptes rendus), avec le mois de grossesse entre parenthèses quand c’est utile.',
    ],
  }),
);

// ===== Leçon 1 =====
content.push(
  ...lecon({
    num: 1, titre: 'Son développement dans le ventre',
    q: 'Est-ce qu’il m’entend quand je lui parle ?',
    objectifs: [
      'Comprendre comment bébé bouge et se développe avant la naissance',
      'Savoir ce qu’il perçoit : toucher, goût, odorat, sons, lumière',
      'Créer un lien avec lui dès la grossesse, pour les deux parents',
      'Connaître le seul signe d’alerte qui ne doit jamais attendre : bébé qui bouge moins',
    ],
    format: 'vidéo de 6 à 8 minutes + fiche PDF « Ses sens avant la naissance ».',
  }),
  h2('Moteur : il bouge bien avant que vous le sentiez'),
  p('Les premiers mouvements apparaissent très tôt et sont visibles à l’échographie dès le 2e mois. Bébé s’étire, se retourne, suce son pouce, a le hoquet. Ces mouvements construisent ses muscles et ses articulations.'),
  ...table(['Repère', 'Quand ?'], [
    ['Le cœur bat (visible à l’échographie)', 'Vers 6 à 7 SA'],
    ['Premiers mouvements à l’échographie', 'Vers 8 à 10 SA'],
    ['La maman sent bouger bébé (1re grossesse)', 'Entre 18 et 22 SA (vers le 5e mois)'],
    ['La maman sent bouger bébé (grossesses suivantes)', 'Parfois dès 16 SA'],
    ['Le partenaire sent bouger en posant la main', 'Souvent vers 24 SA'],
    ['Rythmes de veille et de sommeil, hoquet fréquent', '3e trimestre'],
  ], [5638, 4000]),
  p('En fin de grossesse, bébé a moins de place : il bouge **autant mais différemment**, plus en poussées et en étirements qu’en coups. Il ne doit pas bouger moins.'),
  h2('Sensoriel : il découvre le monde avant d’y arriver'),
  ...table(['Sens', 'Ce qu’il perçoit'], [
    ['Toucher', 'C’est le premier sens à se développer, d’abord autour de la bouche dès le 2e mois, puis sur tout le corps au 2e trimestre. Il touche son visage, le cordon, la paroi de l’utérus.'],
    ['Goût et odorat', 'Il avale du liquide amniotique, qui prend le goût de ce que mange sa mère. Une alimentation variée pendant la grossesse lui fait découvrir des saveurs qu’il reconnaîtra plus tard.'],
    ['Ouïe', 'Son oreille fonctionne vers 25 à 27 SA (6e mois). Il entend le cœur et la digestion de sa mère, et les voix de l’extérieur, assourdies. Les bruits forts le font sursauter.'],
    ['Vue', 'Ses paupières s’ouvrent vers 26 à 28 SA. Il perçoit les variations de lumière à travers le ventre.'],
  ], [2200, 7438]),
  h2('Psychologique : le lien commence avant la naissance'),
  p('À la naissance, un nouveau-né **reconnaît la voix de sa mère** et préfère les sons et les musiques entendus pendant la grossesse. Ce n’est pas de la magie : c’est de la mémoire.'),
  p('Pour les parents aussi, le lien se construit pendant la grossesse. Il peut être immédiat ou venir plus tard, et les deux sont normaux. Certaines personnes ne ressentent pas grand-chose avant d’avoir vu leur bébé : ce n’est ni un manque d’amour ni le signe d’un problème.'),
  h3('Des idées pour créer le lien'),
  ...bullets([
    'Lui parler, lui chanter une chanson, toujours la même, qui pourra l’apaiser après la naissance',
    'Poser les mains sur le ventre et attendre qu’il réponde (le partenaire aussi)',
    'Assister ensemble aux échographies',
    'Lui choisir un surnom, lui écrire une lettre, tenir un journal de grossesse',
    'L’haptonomie : un accompagnement par le toucher, avec un professionnel formé, qui implique beaucoup le partenaire',
  ]),
  ...kine('Bouger aide bébé à bien se placer', [
    'Une maman active garde un bassin mobile, ce qui laisse à bébé plus de liberté pour bouger et se positionner pour la naissance. Marche, ballon de grossesse, bascules du bassin à quatre pattes : des gestes simples à faire chaque jour, sauf contre-indication médicale.',
  ]),
  ...alerte('Bébé bouge moins ? N’attendez pas.', [
    'Au 3e trimestre, si vous sentez votre bébé bouger **nettement moins que d’habitude**, ou plus du tout, allez à la maternité **le jour même**, même la nuit.',
    'Ne vous fiez pas à un appareil d’écoute à domicile : seul un monitoring à la maternité permet de vérifier.',
  ]),
  ...retenir([
    'Bébé bouge très tôt ; vous le sentirez vers le 5e mois pour une première grossesse.',
    'Il entend, goûte et sent avant de naître, et reconnaîtra votre voix.',
    'Le lien peut venir tout de suite ou plus tard : les deux sont normaux.',
    'Un bébé qui bouge moins au 3e trimestre = maternité le jour même.',
  ]),
  ...note('Vidéo possible : le kiné montre les bascules de bassin sur ballon et à quatre pattes ; animation simple des sens qui « s’allument » au fil des mois.'),
);

// ===== Leçon 2 =====
content.push(
  ...lecon({
    num: 2, titre: 'Les premières démarches',
    q: 'Mon test est positif ! Qu’est-ce que je dois faire ?',
    objectifs: [
      'Savoir qui consulter et quand',
      'Déclarer la grossesse dans les délais',
      'Connaître la prise en charge par l’Assurance maladie',
      'Commencer les bons réflexes santé dès les premières semaines',
    ],
    format: 'vidéo de 5 minutes + checklist « Mes premières démarches ».',
  }),
  h2('1. Confirmer la grossesse'),
  p('Un test urinaire positif est très fiable. Une prise de sang (dosage des **bêta-hCG**) peut confirmer la grossesse et aider à la dater ; elle est souvent prescrite lors de la première consultation.'),
  h2('2. Choisir qui va suivre la grossesse'),
  ...table(['Professionnel', 'Pour qui ?'], [
    ['Sage-femme', 'Toutes les grossesses qui se déroulent normalement. Elle peut assurer tout le suivi, prescrire les examens, les échographies et la préparation à la naissance.'],
    ['Médecin généraliste', 'Le début du suivi, souvent jusqu’au 6e ou 7e mois, si la grossesse se déroule normalement.'],
    ['Gynécologue-obstétricien', 'Indispensable en cas de grossesse à risque (maladie chronique, grossesse gémellaire, antécédents). Possible aussi pour une grossesse normale.'],
  ], [2800, 6838]),
  p('Quel que soit le choix, le dernier mois se fait souvent à la maternité où vous accoucherez.'),
  h2('3. La première consultation, avant la fin du 3e mois'),
  p('La première consultation prénatale doit avoir lieu **avant la fin du 3e mois de grossesse** (avant 15 SA). Le professionnel :'),
  ...bullets([
    'confirme et date la grossesse ;',
    'fait le point sur votre santé, vos antécédents et vos traitements ;',
    'prescrit les premières prises de sang et la première échographie ;',
    'remplit et envoie la **déclaration de grossesse** en ligne à votre caisse d’Assurance maladie et à la CAF.',
  ]),
  ...callout({
    title: 'La déclaration de grossesse', fill: C.miel,
    body: ['Elle doit être faite **avant la fin de la 14e semaine de grossesse** (14 SA + 2, soit la fin du 3e mois). C’est elle qui ouvre vos droits : prise en charge des examens, congé maternité, prestations de la CAF. Le professionnel la transmet en ligne ; vérifiez qu’elle a bien été envoyée.'],
  }),
  h2('4. Ce qui est pris en charge'),
  ...bullets([
    'Les **examens obligatoires** (consultations prénatales, prises de sang, échographies) sont remboursés tout au long de la grossesse.',
    'À partir du **1er jour du 6e mois** et jusqu’à 12 jours après l’accouchement, tous les frais médicaux sont pris en charge à 100 %, qu’ils soient liés à la grossesse ou non.',
    'L’entretien prénatal précoce et les séances de préparation à la naissance sont pris en charge à 100 %.',
    'Pensez à prévenir votre mutuelle : certaines offrent des services (chambre particulière, ostéopathie, forfait naissance).',
  ]),
  h2('5. S’inscrire à la maternité'),
  p('Dans certaines villes, les places partent vite : inscrivez-vous **dès le premier trimestre**. Les maternités sont classées selon les soins qu’elles peuvent offrir aux nouveau-nés :'),
  ...table(['Type', 'Ce que cela veut dire'], [
    ['Type 1', 'Pour les grossesses sans risque particulier et les bébés nés à terme et en bonne santé.'],
    ['Type 2', 'Avec un service de néonatologie, pour les bébés qui ont besoin d’une surveillance ou nés un peu prématurément.'],
    ['Type 3', 'Avec une réanimation néonatale, pour les grossesses à haut risque et les grands prématurés.'],
  ], [1800, 7838]),
  p('Une grossesse normale peut parfaitement se dérouler en type 1. Votre suivi pourra vous orienter si besoin. Pensez aussi au trajet : en fin de grossesse, la distance compte.'),
  h2('6. Les bons réflexes dès maintenant'),
  ...bullets([
    '**Acide folique (vitamine B9)** : si ce n’est pas déjà fait, demandez-le dès que vous savez que vous êtes enceinte. Il réduit le risque de malformation de la colonne vertébrale (spina bifida). Idéalement commencé avant la conception, il est poursuivi jusqu’à 12 SA.',
    '**Zéro alcool**, dès maintenant et jusqu’à la naissance (voir leçon 6).',
    'Si vous fumez, c’est le bon moment pour vous faire aider, sans culpabilité (voir leçon 6).',
    'Pas de médicament sans avis, y compris ceux que vous preniez avant (sauf traitement chronique : n’arrêtez pas seule, parlez-en vite à votre médecin).',
    'Récupérez le **carnet de santé maternité** et le livret des 1000 premiers jours.',
  ]),
  h2('7. Et au travail ?'),
  p('Vous n’êtes pas obligée d’annoncer votre grossesse tout de suite. Mais dès que votre employeur est informé (par écrit, avec un certificat de grossesse), vous êtes **protégée contre le licenciement** et vous avez droit à des **autorisations d’absence rémunérées** pour les examens médicaux obligatoires. Le second parent salarié a droit à une autorisation d’absence pour assister à trois de ces examens.'),
  ...retenir([
    'Première consultation et déclaration de grossesse avant la fin du 3e mois.',
    'Sage-femme, médecin généraliste ou gynécologue : à vous de choisir.',
    'Inscrivez-vous tôt à la maternité.',
    'Acide folique, zéro alcool, pas d’automédication.',
  ]),
  ...note('Fiche : checklist « Mes premières démarches » (test, 1re consultation, déclaration, maternité, B9, mutuelle, employeur). Dates et règles à vérifier sur ameli.fr et service-public.fr avant publication.'),
);

// ===== Leçon 3 =====
content.push(
  ...lecon({
    num: 3, titre: 'Les rendez-vous et examens',
    q: 'C’est quoi tous ces examens ? Ils sont obligatoires ?',
    objectifs: [
      'Avoir une vue d’ensemble du suivi, du début à la fin de la grossesse',
      'Comprendre à quoi sert chaque échographie et chaque prise de sang',
      'Comprendre le dépistage de la trisomie 21 et du diabète gestationnel',
      'Connaître l’entretien prénatal précoce et les vaccins recommandés',
    ],
    format: 'vidéo de 8 minutes + fiche « Mon calendrier de grossesse » (la plus utile de l’étape).',
  }),
  h2('Le calendrier du suivi'),
  ...table(['Quand', 'Ce qui est prévu'], [
    ['Avant 15 SA (fin du 3e mois)', '1re consultation prénatale, déclaration de grossesse, premières prises de sang'],
    ['Idéalement au 1er trimestre', 'Entretien prénatal précoce (sage-femme ou médecin), seule ou en couple'],
    ['Entre 11 et 13 SA + 6 jours', '1re échographie : datation, nombre de bébés, mesure de la nuque'],
    ['Chaque mois à partir du 4e mois', 'Consultation prénatale (7 au total sont obligatoires) avec analyse d’urine'],
    ['À partir du 4e mois', 'Examen bucco-dentaire pris en charge'],
    ['Entre 20 et 25 SA (souvent vers 22 SA)', '2e échographie, dite morphologique'],
    ['Entre 24 et 28 SA', 'Dépistage du diabète gestationnel si facteurs de risque'],
    ['Au 6e mois', 'Prise de sang (dont numération formule sanguine)'],
    ['Entre 30 et 35 SA (souvent vers 32 SA)', '3e échographie : croissance, position de bébé, placenta'],
    ['Au 3e trimestre', 'Consultation d’anesthésie (obligatoire, même sans péridurale prévue)'],
    ['Entre 34 et 38 SA', 'Prélèvement vaginal (recherche du streptocoque B)'],
    ['À partir de 41 SA', 'Surveillance rapprochée à la maternité si bébé n’est pas né'],
  ], [3300, 6338]),
  h2('Les trois échographies'),
  ...table(['Échographie', 'À quoi elle sert'], [
    ['1re (11-13 SA + 6 j)', 'Dater précisément la grossesse et fixer la date prévue d’accouchement, vérifier le nombre de bébés, mesurer la clarté nucale (épaisseur de la nuque) pour le dépistage de la trisomie 21.'],
    ['2e (20-25 SA)', 'Examiner l’anatomie de bébé organe par organe, vérifier sa croissance, la position du placenta. On peut souvent connaître le sexe, si vous le souhaitez.'],
    ['3e (30-35 SA)', 'Vérifier la croissance et la position de bébé (tête en bas ou en siège), la quantité de liquide et la position du placenta.'],
  ], [2600, 7038]),
  p('D’autres échographies peuvent être prescrites si besoin. Une échographie supplémentaire n’est pas forcément le signe d’un problème : c’est souvent une simple vérification.'),
  h2('Les prises de sang du début de grossesse'),
  ...bullets([
    '**Groupe sanguin et rhésus**, et recherche d’agglutinines irrégulières (RAI). Si vous êtes de rhésus négatif, un suivi et parfois une injection préventive sont proposés.',
    '**Toxoplasmose** : si vous n’êtes pas immunisée, une prise de sang est faite **chaque mois** et des précautions alimentaires sont nécessaires (voir leçon 6).',
    '**Rubéole**, **syphilis**, **hépatite B**.',
    '**VIH** et **hépatite C** : le dépistage est systématiquement proposé.',
    'Glycémie à jeun au 1er trimestre si vous avez des facteurs de risque de diabète.',
  ]),
  h2('Le dépistage de la trisomie 21'),
  p('Il est **proposé à toutes les femmes, jamais imposé**. C’est votre choix de le faire ou non.'),
  ...numbered([
    '**Dépistage combiné** au 1er trimestre : la mesure de la nuque à l’échographie, une prise de sang (marqueurs sériques) et votre âge donnent un niveau de risque.',
    'Si le risque est intermédiaire, on propose un **test ADN** sur prise de sang (DPNI), sans risque pour la grossesse.',
    'Si le risque est élevé ou le test ADN positif, seul un **prélèvement** (amniocentèse ou choriocentèse) permet de poser un diagnostic. Il comporte un petit risque de fausse couche et se discute avec l’équipe.',
  ], 'num-t21'),
  p('Un risque « élevé » ne veut pas dire que bébé est atteint. Prenez le temps de poser vos questions avant chaque étape.'),
  h2('Le diabète gestationnel'),
  p('C’est un diabète qui apparaît pendant la grossesse et disparaît en général après l’accouchement. Il concerne environ **une grossesse sur dix**. Non suivi, il peut entraîner un bébé trop gros, un accouchement plus difficile et une hypertension.'),
  h3('Qui est dépistée ?'),
  p('Les femmes qui ont au moins un facteur de risque :'),
  ...bullets([
    '35 ans ou plus ;',
    'surpoids avant la grossesse (IMC de 25 ou plus) ;',
    'un parent, un frère ou une sœur diabétique (type 2) ;',
    'un diabète gestationnel ou un bébé de plus de 4 kg lors d’une grossesse précédente.',
  ]),
  p('Le dépistage se fait par une **glycémie à jeun** au 1er trimestre, puis une **hyperglycémie provoquée** (on boit un liquide sucré et on mesure le sucre dans le sang) entre 24 et 28 SA.'),
  h3('Et si le test est positif ?'),
  ...bullets([
    'Une alimentation adaptée (rendez-vous avec une diététicienne), sans régime restrictif ;',
    'une activité physique régulière, comme 30 minutes de marche par jour ;',
    'une surveillance de la glycémie au doigt plusieurs fois par jour ;',
    'parfois de l’insuline, sans danger pour bébé, si cela ne suffit pas.',
  ]),
  p('Après la naissance, un contrôle est fait quelques semaines plus tard, puis régulièrement, car le risque de diabète plus tard dans la vie est augmenté.'),
  h2('L’entretien prénatal précoce'),
  p('C’est un temps d’échange, **sans examen médical**, avec une sage-femme ou un médecin, idéalement au 1er trimestre. Il est systématiquement proposé et pris en charge à 100 %. On y parle de vos questions, de vos émotions, de votre projet, de votre situation (travail, logement, soutien), et on vous oriente si besoin. Le partenaire est le bienvenu.'),
  h2('Les vaccins recommandés pendant la grossesse'),
  ...table(['Vaccin', 'Pourquoi ?'], [
    ['Grippe', 'La grossesse augmente le risque de grippe grave. Recommandé pendant la saison, quel que soit le trimestre.'],
    ['Coqueluche', 'Les anticorps passent à bébé et le protègent dès la naissance. Recommandé à chaque grossesse, à partir du 2e trimestre (idéalement entre 20 et 36 SA).'],
    ['Covid-19', 'Recommandé selon les recommandations en vigueur.'],
    ['Bronchiolite (VRS)', 'Selon la saison, une vaccination en fin de grossesse peut être proposée pour protéger bébé ; l’autre option est un traitement préventif donné à bébé après la naissance. À discuter avec votre sage-femme ou médecin.'],
  ], [2600, 7038]),
  ...retenir([
    '7 consultations prénatales et 3 échographies rythment la grossesse.',
    'Le dépistage de la trisomie 21 est proposé, jamais imposé.',
    'Diabète gestationnel : dépisté si facteurs de risque, il se soigne bien.',
    'Gardez tous vos résultats dans un même dossier, à emporter à chaque rendez-vous et à la maternité.',
  ]),
  ...note('Fiche : « Mon calendrier de grossesse » avec une colonne date prévue / date faite / notes. Vérifier les recommandations vaccinales de la saison en cours (calendrier vaccinal annuel) avant publication.'),
);

// ===== Leçon 4 — framboise =====
const F = { accent: C.framboise, surface: C.rose, parents: true };
content.push(
  ...lecon({
    num: 4, titre: 'Mon corps change, trimestre par trimestre',
    q: 'J’ai mal au dos et je suis épuisée : c’est normal ?',
    objectifs: [
      'Savoir ce qui est fréquent à chaque trimestre et comment se soulager',
      'Protéger son dos, son bassin et son périnée au quotidien',
      'Bouger pendant la grossesse, en sécurité',
      'Reconnaître ce qui doit faire consulter',
    ],
    format: 'vidéo de 10 minutes avec démonstrations du kiné + fiche « Mes exercices de grossesse ».',
    ...F,
  }),
  h2('1er trimestre (jusqu’à 14 SA) : un bouleversement invisible', C.framboise),
  ...table(['Ce qui arrive souvent', 'Ce qui soulage'], [
    ['Nausées, parfois vomissements, souvent jusqu’à 12-14 SA', 'Manger un peu avant de se lever, fractionner en petits repas, éviter les odeurs fortes, boire entre les repas, gingembre. Consulter si vous ne gardez rien ou perdez du poids.'],
    ['Grande fatigue', 'Siestes, se coucher tôt, accepter de ralentir. Elle s’améliore souvent au 2e trimestre.'],
    ['Seins tendus et gonflés', 'Un soutien-gorge confortable, sans armatures si elles gênent.'],
    ['Envies fréquentes d’uriner', 'Normal : l’utérus appuie sur la vessie. Brûlures ou fièvre = consulter.'],
    ['Émotions en montagnes russes', 'Les hormones y sont pour beaucoup. En parler, ne pas rester seule avec ses inquiétudes.'],
  ], [3800, 5838], C.framboise),
  h2('2e trimestre (15 à 28 SA) : souvent le plus agréable', C.framboise),
  ...table(['Ce qui arrive souvent', 'Ce qui soulage'], [
    ['Le ventre s’arrondit, petites douleurs sur les côtés (ligaments)', 'Se lever et se tourner lentement. Douleur forte ou qui dure = consulter.'],
    ['Brûlures d’estomac', 'Petits repas, éviter de s’allonger juste après, surélever la tête du lit.'],
    ['Constipation', 'Boire, manger des fibres (fruits, légumes, céréales complètes), marcher.'],
    ['Nez bouché, gencives qui saignent', 'Lavage de nez au sérum physiologique ; brossage doux et rendez-vous chez le dentiste.'],
    ['Taches sur la peau, ligne brune sur le ventre', 'Protection solaire ; elles s’estompent après la naissance.'],
  ], [3800, 5838], C.framboise),
  h2('3e trimestre (29 SA à la naissance) : le corps se prépare', C.framboise),
  ...table(['Ce qui arrive souvent', 'Ce qui soulage'], [
    ['Essoufflement, reflux', 'Se tenir droite, petits repas, dormir un peu redressée.'],
    ['Jambes lourdes, chevilles gonflées, crampes', 'Surélever les jambes, marcher, bas de contention si prescrits. Gonflement brutal du visage ou des mains = consulter.'],
    ['Douleurs de dos et de bassin', 'Voir l’espace du kiné ci-dessous.'],
    ['Sommeil difficile', 'Dormir sur le côté avec un coussin entre les genoux ; siestes.'],
    ['Contractions irrégulières, sans douleur (le ventre durcit)', 'Normales si elles restent rares et cèdent au repos. Régulières ou douloureuses avant 37 SA = maternité.'],
    ['Petites fuites urinaires en toussant', 'Fréquentes ; exercices du périnée (ci-dessous). À signaler à la sage-femme.'],
  ], [3800, 5838], C.framboise),
  h2('La prise de poids', C.framboise),
  p('Elle dépend de votre corpulence avant la grossesse. Ce sont des repères, pas des objectifs à surveiller au gramme près.'),
  ...table(['IMC avant la grossesse', 'Prise de poids recommandée'], [
    ['Moins de 18,5', '12,5 à 18 kg'],
    ['18,5 à 24,9', '11,5 à 16 kg'],
    ['25 à 29,9', '7 à 11,5 kg'],
    ['30 et plus', '5 à 9 kg'],
  ], [4800, 4838], C.framboise),
  ...kine('Protéger son dos et son bassin', [
    'Le ventre qui grossit tire le dos vers l’avant et les hormones rendent les ligaments plus souples. Quelques gestes changent tout :',
  ], [
    '**Se relever du lit en passant par le côté** : rouler sur le côté, pousser avec les bras, puis s’asseoir.',
    '**Porter près du corps**, genoux pliés, en soufflant pendant l’effort.',
    '**Assise** : les pieds à plat, le dos calé par un coussin, et se lever toutes les heures.',
    '**La nuit** : sur le côté, un coussin entre les genoux (et sous le ventre en fin de grossesse).',
    '**Douleur du bassin** (pubis, fesses, en marchant ou en se retournant) : garder les genoux serrés pour se retourner et sortir de la voiture, faire de plus petits pas. Un kiné peut vous soulager : n’hésitez pas à demander une prescription.',
  ]),
  h2('Le périnée pendant la grossesse', C.framboise),
  p('Le périnée est l’ensemble des muscles qui ferment le bas du bassin et soutiennent la vessie, l’utérus et le rectum. Pendant la grossesse, il porte le poids de bébé ; à l’accouchement, il doit s’étirer.'),
  ...bullets([
    '**Le sentir** : imaginer retenir un gaz et une envie d’uriner en même temps, sans serrer les fesses ni bloquer la respiration.',
    '**Le contracter en soufflant** avant un effort (toux, éternuement, port de charge).',
    '**Ne pas pousser** aux toilettes, ni faire le « stop pipi » (couper le jet) comme exercice.',
    '**Le massage du périnée**, à partir de 34 SA environ, pour une première grossesse, peut diminuer le risque de déchirure. Il s’apprend avec la sage-femme.',
  ]),
  h2('Bouger pendant la grossesse', C.framboise),
  p('Sauf contre-indication médicale, l’activité physique est **recommandée** : environ **150 minutes par semaine** d’activité modérée (on peut parler, mais pas chanter). Elle réduit le risque de diabète gestationnel, aide le sommeil, le moral et la récupération après l’accouchement.'),
  ...table(['Plutôt oui', 'Plutôt non'], [
    ['Marche, natation, aquagym, vélo d’appartement, yoga et Pilates prénataux, renforcement doux', 'Sports de contact ou à risque de chute (ski, équitation, sports de combat), plongée sous-marine, efforts en apnée, longues séances allongée sur le dos en fin de grossesse'],
  ], [4819, 4819], C.framboise),
  ...alerte('Arrêtez l’effort et consultez si…', [
    'saignements, perte de liquide ou contractions régulières ;',
    'vertiges, malaise, douleur dans la poitrine, essoufflement inhabituel ;',
    'maux de tête intenses ;',
    'douleur ou gonflement d’un mollet.',
  ]),
  ...retenir([
    'Chaque trimestre a ses petits maux ; la plupart se soulagent simplement.',
    'Se relever par le côté, porter près du corps, dormir sur le côté.',
    'Bouger est recommandé : 150 minutes par semaine, adaptées.',
    'Le périnée se prépare dès la grossesse.',
  ]),
  ...note('Vidéo kiné : se relever du lit, posture assise, 4 exercices (respiration abdominale, bascule du bassin, chat-vache à quatre pattes, conscience du périnée). Fiche « Mes exercices de grossesse » avec dessins.'),
);

// ===== Leçon 5 =====
content.push(
  ...lecon({
    num: 5, titre: 'Bébé grandit dans le ventre, mois par mois',
    q: 'Il mesure combien en ce moment ?',
    objectifs: [
      'Suivre l’évolution de bébé mois par mois',
      'Comprendre ce que veulent dire « terme » et « prématurité »',
      'Connaître le rôle du placenta, du cordon et du liquide amniotique',
    ],
    format: 'série de courtes vidéos ou cartes (une par mois), idéales aussi pour les réseaux sociaux + frise PDF.',
  }),
  h2('Mois par mois'),
  p('Les tailles et poids sont des moyennes, mesurées de la tête aux pieds à partir du 4e mois. Chaque bébé grandit à son rythme ; c’est la courbe de croissance suivie aux échographies qui compte.'),
  ...table(['Mois (SA)', 'Taille et poids environ', 'Ce qui se passe'], [
    ['1er mois (jusqu’à 6 SA)', 'Quelques millimètres', 'L’œuf s’implante dans l’utérus. Le cœur commence à battre.'],
    ['2e mois (jusqu’à 10 SA)', '3 cm', 'Tous les organes se mettent en place. Les bras et les jambes apparaissent. Il devient « fœtus » à la fin du mois.'],
    ['3e mois (jusqu’à 14 SA)', '12 cm, 65 g', 'Il a forme humaine, bouge beaucoup. Les organes sexuels se forment. Le risque de fausse couche diminue nettement.'],
    ['4e mois (jusqu’à 18 SA)', '20 cm, 250 g', 'Il suce son pouce, avale du liquide amniotique. Un fin duvet (le lanugo) couvre sa peau.'],
    ['5e mois (jusqu’à 23 SA)', '30 cm, 650 g', 'Vous le sentez bouger. Il dort beaucoup, a des périodes d’activité.'],
    ['6e mois (jusqu’à 27 SA)', '37 cm, 1 kg', 'Il entend. Ses paupières s’ouvrent. Ses poumons se développent.'],
    ['7e mois (jusqu’à 32 SA)', '42 cm, 1,7 kg', 'Il perçoit la lumière, se met souvent tête en bas. Il fabrique ses réserves de graisse.'],
    ['8e mois (jusqu’à 36 SA)', '47 cm, 2,5 kg', 'Il prend environ 200 g par semaine. Il a moins de place et bouge différemment.'],
    ['9e mois (jusqu’à 41 SA)', '50 cm, 3,3 kg', 'Il est prêt. Il descend dans le bassin. Ses poumons sont matures.'],
  ], [2300, 2200, 5138]),
  h2('Le terme et la prématurité'),
  ...bullets([
    'Un bébé est dit **à terme** entre 37 et 42 SA. La date prévue d’accouchement est fixée à 41 SA, mais seule une minorité de bébés naît ce jour-là.',
    'Un bébé né **avant 37 SA** est prématuré. La plupart des prématurés naissent après 32 SA et vont très bien ; plus la naissance est précoce, plus bébé a besoin de soins.',
    'Si bébé n’est pas né à 41 SA, une surveillance rapprochée est mise en place, et un déclenchement est discuté avant 42 SA.',
  ]),
  h2('Le placenta, le cordon et le liquide amniotique'),
  ...table(['Élément', 'Son rôle'], [
    ['Placenta', 'Il apporte l’oxygène et les nutriments de la mère à bébé et évacue ses déchets. Il laisse passer certaines substances : alcool, nicotine, certains médicaments.'],
    ['Cordon ombilical', 'Il relie bébé au placenta. Il est souple et protégé : bébé ne peut pas « s’étrangler » en bougeant.'],
    ['Liquide amniotique', 'Il protège bébé des chocs, garde une température stable et lui permet de bouger et d’entraîner ses poumons et sa déglutition.'],
  ], [2600, 7038]),
  ...retenir([
    'Bébé passe de quelques millimètres à environ 50 cm et 3,3 kg.',
    'À terme = entre 37 et 42 SA.',
    'Le placenta nourrit bébé, mais laisse passer l’alcool et le tabac.',
  ]),
  ...note('Bon support de contenu gratuit : une carte « Bébé ce mois-ci » par mois, à publier sur les réseaux, qui renvoie vers la formation. Illustrations à créer dans le style de la charte (pictos à gros trait, pas d’images médicales).'),
);

// ===== Leçon 6 — framboise =====
content.push(
  ...lecon({
    num: 6, titre: 'Ce que je mange, ce que j’évite',
    q: 'J’ai le droit de manger du fromage ?',
    objectifs: [
      'Savoir quoi éviter et pourquoi (toxoplasmose, listériose, mercure)',
      'Bien manger sans « manger pour deux »',
      'Comprendre pourquoi zéro alcool, et se faire aider pour le tabac sans être jugée',
      'Prendre les bons réflexes avec les médicaments',
    ],
    format: 'vidéo de 7 minutes + fiche aimantée « Au frigo : oui / non ».',
    ...F,
  }),
  h2('Bien manger, pas manger pour deux', C.framboise),
  p('Les besoins augmentent surtout au 3e trimestre, et assez peu. Une alimentation **variée et équilibrée** suffit : fruits et légumes à chaque repas, féculents, protéines (viande, poisson, œufs, légumineuses), produits laitiers, et de l’eau à volonté.'),
  ...bullets([
    '**Vitamine B9 (acide folique)** : supplément jusqu’à 12 SA.',
    '**Vitamine D** : une dose est souvent prescrite au 7e mois.',
    '**Fer** : seulement si la prise de sang montre une carence.',
    'Pas d’autres compléments sans avis : « naturel » ne veut pas dire sans risque.',
  ]),
  h2('La toxoplasmose (si vous n’êtes pas immunisée)', C.framboise),
  p('C’est un parasite sans gravité pour l’adulte, mais qui peut être dangereux pour bébé. Votre prise de sang dit si vous êtes protégée. Si ce n’est pas le cas :'),
  ...bullets([
    'viande **bien cuite** (plus rosée), y compris le gibier ; pas de viande fumée ou marinée crue ;',
    'fruits, légumes et herbes aromatiques **lavés soigneusement**, surtout s’ils sont mangés crus ;',
    'se laver les mains après avoir touché de la terre ou de la viande crue ;',
    'gants pour jardiner ; litière du chat changée chaque jour par quelqu’un d’autre (ou avec des gants).',
  ]),
  h2('La listériose (pour toutes)', C.framboise),
  p('C’est une bactérie rare mais grave pendant la grossesse. Elle se développe même au réfrigérateur.'),
  ...table(['À éviter', 'Par quoi le remplacer'], [
    ['Fromages au lait cru (sauf pâtes pressées cuites comme le comté ou l’emmental), croûte des fromages', 'Fromages au lait pasteurisé sans la croûte, fromages cuits (gratins, pizzas)'],
    ['Charcuteries crues ou à la coupe, rillettes, pâtés, foie gras', 'Jambon cuit préemballé, charcuterie cuite dans un plat chaud'],
    ['Poisson cru (sushis), fumé, coquillages crus, surimi, tarama', 'Poisson bien cuit, en conserve'],
    ['Graines germées crues, lait cru', 'Légumes cuits, lait pasteurisé ou UHT'],
    ['Restes de plus de 24 h, plats réchauffés tièdes', 'Restes bien réchauffés, jusqu’à ce qu’ils fument'],
  ], [4819, 4819], C.framboise),
  h2('Le poisson : oui, mais pas n’importe lequel', C.framboise),
  p('Le poisson est excellent pour le développement du cerveau de bébé : **deux portions par semaine**, dont un poisson gras (sardine, maquereau, saumon). Mais certains grands poissons contiennent du mercure : **éviter l’espadon, le marlin, le requin et la lamproie**, et limiter le thon.'),
  h2('Alcool : zéro, tout au long de la grossesse', C.framboise),
  p('L’alcool passe le placenta et peut toucher le cerveau de bébé à tous les stades de la grossesse. **Il n’existe pas de dose sans risque**, même un verre de temps en temps. Si vous avez bu avant de savoir que vous étiez enceinte, ne paniquez pas : arrêtez maintenant et parlez-en à votre sage-femme ou médecin.'),
  h2('Tabac : se faire aider, sans culpabilité', C.framboise),
  p('Arrêter de fumer est difficile : c’est une dépendance, pas un manque de volonté. Chaque cigarette en moins compte, et **il n’est jamais trop tard** pour arrêter pendant la grossesse.'),
  ...bullets([
    'Votre sage-femme ou médecin peut **prescrire des substituts nicotiniques** (patchs, gommes), autorisés pendant la grossesse et remboursés.',
    '**Tabac Info Service** : 39 89 (appel non surtaxé), avec un suivi par un tabacologue.',
    'Le partenaire et l’entourage sont concernés aussi : pas de tabac dans le logement ni en voiture, ni pendant la grossesse, ni après la naissance.',
    'Le cannabis passe aussi le placenta : parlez-en à votre suivi pour être accompagnée.',
  ]),
  ...callout({ label: 'Note de ton', body: ['Ici, aucun jugement : on informe sur les effets et on oriente vers l’aide. Cette partie répond à la remarque de Serena sur le « jugement insidieux » des parents fumeurs.'], fill: C.miel }),
  h2('Café, thé et boissons', C.framboise),
  p('Limiter la caféine : environ **2 à 3 tasses de café par jour au maximum** (le thé, le cola et les boissons énergisantes en contiennent aussi). Éviter les boissons énergisantes et les grandes quantités de réglisse.'),
  h2('Les médicaments', C.framboise),
  ...bullets([
    '**Pas d’automédication**, même pour un médicament que vous connaissez bien. Demandez toujours à votre médecin, sage-femme ou pharmacien.',
    'Contre la douleur ou la fièvre, le **paracétamol** est le médicament de référence, à la dose la plus faible et le moins longtemps possible.',
    'L’**ibuprofène et les autres anti-inflammatoires**, ainsi que l’aspirine à dose antidouleur, sont **interdits à partir du 6e mois** et déconseillés avant.',
    'Huiles essentielles et plantes : pas sans avis.',
    'Un pictogramme « femme enceinte » figure sur les boîtes de médicaments à risque.',
  ]),
  ...retenir([
    'Manger varié, pas pour deux. B9 au début, vitamine D au 7e mois.',
    'Toxoplasmose : viande bien cuite et légumes bien lavés. Listériose : pas de lait cru ni de charcuterie à la coupe.',
    'Zéro alcool ; pour le tabac, de l’aide existe et elle est remboursée.',
    'Pas de médicament sans avis ; jamais d’anti-inflammatoire à partir du 6e mois.',
  ]),
  ...note('Fiche « Au frigo : oui / non » en deux colonnes, à imprimer. Sources : Santé publique France, ANSES, CRAT (lecrat.fr) pour les médicaments.'),
);

// ===== Leçon 7 =====
content.push(
  ...lecon({
    num: 7, titre: 'Préparer la naissance',
    q: 'Comment je saurai que c’est le moment de partir ?',
    objectifs: [
      'Choisir une préparation à la naissance qui vous ressemble',
      'Rédiger un projet de naissance',
      'Connaître les moyens de soulager la douleur',
      'Reconnaître les signes du travail et savoir quand partir',
    ],
    format: 'vidéo de 10 minutes (dont positions et respiration avec le kiné) + fiche « Quand partir à la maternité ».',
  }),
  h2('La préparation à la naissance et à la parentalité'),
  p('L’Assurance maladie prend en charge à 100 % **7 séances** de préparation, en plus de l’entretien prénatal précoce. Elles se font avec une sage-femme, en groupe ou seule, à partir du 2e trimestre en général. Le partenaire est bienvenu.'),
  ...table(['Méthode', 'En quelques mots'], [
    ['Classique', 'Le déroulement de la grossesse et de l’accouchement, la respiration, les positions, l’allaitement, le retour à la maison.'],
    ['Sophrologie', 'Relaxation, respiration et visualisation pour gérer le stress et la douleur.'],
    ['Haptonomie', 'Le contact par le toucher avec bébé ; très impliquante pour le partenaire.'],
    ['Préparation en piscine', 'Exercices dans l’eau, qui soulage le dos et les jambes.'],
    ['Yoga prénatal', 'Postures, souffle et détente ; à faire avec un professeur formé à la grossesse.'],
    ['Chant prénatal', 'Les vibrations de la voix pour se détendre et communiquer avec bébé.'],
  ], [2600, 7038]),
  p('Certaines méthodes ne sont remboursées que si elles sont réalisées par une sage-femme. Renseignez-vous avant de vous inscrire.'),
  h2('Le projet de naissance'),
  p('C’est un document court dans lequel vous exprimez **vos souhaits** pour l’accouchement et les premières heures. Il ouvre le dialogue avec l’équipe de la maternité ; il ne garantit pas que tout se passera ainsi, car la priorité reste votre sécurité et celle de bébé.'),
  h3('Ce qu’on peut y mettre'),
  ...bullets([
    'Péridurale ou non, ou « on verra le moment venu » ;',
    'la liberté de bouger, de boire, les positions pour le travail et la naissance ;',
    'qui est présent, la musique, la lumière ;',
    'le peau à peau immédiat, le clampage retardé du cordon, la première tétée ;',
    'vos souhaits si une césarienne est nécessaire (peau à peau, présence du partenaire) ;',
    'vos peurs ou vos expériences passées que l’équipe doit connaître.',
  ]),
  h2('Soulager la douleur'),
  h3('La péridurale'),
  p('C’est une anesthésie qui endort la douleur du bas du corps tout en vous laissant consciente. Elle est posée par un anesthésiste pendant le travail. La **consultation d’anesthésie au 3e trimestre est obligatoire**, même si vous ne souhaitez pas de péridurale : elle permet d’agir vite en cas de besoin.'),
  h3('Les moyens sans médicament'),
  ...bullets([
    'bouger, marcher, changer de position ;',
    'le ballon, la suspension (liane), la baignoire ou la douche chaude ;',
    'la respiration, la sophrologie, l’hypnose ;',
    'les massages du bas du dos par le partenaire, la chaleur.',
  ]),
  ...kine('Les positions qui aident pendant le travail', [
    'Un bassin mobile laisse plus de place à bébé pour descendre. Entre les contractions, et quand c’est possible :',
  ], [
    '**Assise sur un ballon**, en faisant des cercles avec le bassin.',
    '**Penchée en avant**, les bras appuyés sur le lit ou sur le partenaire.',
    '**À quatre pattes**, pour soulager le dos.',
    '**Couchée sur le côté**, un coussin entre les genoux, même avec une péridurale.',
    '**Pour pousser** : on pousse en soufflant, sans bloquer la respiration, en suivant les consignes de la sage-femme.',
  ]),
  h2('Les signes du travail'),
  ...table(['Signe', 'Que faire ?'], [
    ['Perte du bouchon muqueux (glaire parfois rosée)', 'Rien de particulier : le travail peut commencer dans quelques heures ou quelques jours.'],
    ['Contractions irrégulières qui cèdent au repos ou dans un bain', 'Faux travail : se reposer, prendre un bain.'],
    ['Contractions régulières, de plus en plus rapprochées et intenses', 'Le travail commence : voir quand partir ci-dessous.'],
    ['Perte de liquide (poche des eaux rompue), même un filet continu', 'Partir à la maternité, sans urgence si le liquide est clair ; tout de suite s’il est teinté (vert, marron) ou s’il y a du sang.'],
  ], [4200, 5438]),
  ...callout({
    title: 'Quand partir à la maternité ?', fill: C.miel,
    body: [
      '**Premier bébé** : contractions toutes les 5 minutes depuis environ 2 heures.',
      '**Bébés suivants** : contractions toutes les 5 minutes depuis environ 1 heure, ou plus tôt si le premier accouchement a été rapide.',
      'Et **toujours sans attendre** en cas de perte de liquide, de saignement, de fièvre, si bébé bouge moins, ou si vous habitez loin de la maternité.',
      'Suivez en priorité les consignes données par votre maternité, et n’hésitez jamais à appeler pour demander conseil.',
    ],
  }),
  h2('Les différentes façons de naître'),
  p('La plupart des bébés naissent par voie basse, spontanément. Parfois, l’équipe utilise une ventouse ou des forceps pour aider bébé à sortir. Environ **un accouchement sur cinq** se fait par césarienne, prévue à l’avance ou décidée pendant le travail. Dans tous les cas, le peau à peau et la présence du partenaire sont souvent possibles : parlez-en avec l’équipe.'),
  ...retenir([
    '7 séances de préparation sont prises en charge : choisissez celle qui vous ressemble.',
    'Le projet de naissance ouvre le dialogue avec l’équipe.',
    'La consultation d’anesthésie est obligatoire, même sans péridurale prévue.',
    'Contractions toutes les 5 minutes depuis 2 h (1er bébé) : c’est le moment de partir.',
  ]),
  ...note('Fiche « Quand partir à la maternité » + modèle de projet de naissance à remplir. Vidéo kiné : les 5 positions sur ballon, à quatre pattes, sur le côté, avec le partenaire.'),
);

// ===== Leçon 8 =====
content.push(
  ...lecon({
    num: 8, titre: 'Préparer la maison et la valise',
    q: 'Qu’est-ce qu’il faut vraiment acheter avant la naissance ?',
    objectifs: [
      'Distinguer l’indispensable de ce qui peut attendre',
      'Installer un couchage sûr',
      'Choisir et installer le siège auto',
      'Préparer la valise de maternité pour la maman et pour bébé',
    ],
    format: 'vidéo de 8 minutes + 4 fiches à cocher (achats, chambre sûre, siège auto, valise).',
  }),
  h2('L’équipement : l’utile avant le superflu'),
  ...table(['', 'Indispensable dès la naissance', 'Peut attendre'], [
    ['Sommeil', 'Lit aux normes, matelas ferme et neuf, 2 draps housse, 2 gigoteuses', 'Babyphone, veilleuse, mobile'],
    ['Transport', 'Siège auto R129 (i-Size), installé dos à la route', 'Poussette, porte-bébé physiologique'],
    ['Change', 'Couches, liniment ou savon doux, coton, une surface stable', 'Table à langer, chauffe-lingettes'],
    ['Toilette', 'Bassine ou baignoire, thermomètre de bain, serviette, coupe-ongles', 'Transat de bain, cape de bain'],
    ['Vêtements', '6 bodies, 6 pyjamas, 2 gilets, 1 bonnet, chaussettes', 'Tenues habillées, chaussures'],
    ['Repas', 'Matériel d’allaitement, ou 4 à 6 biberons et un goupillon', 'Tire-lait (souvent loué), stérilisateur, chauffe-biberon'],
    ['Santé', 'Thermomètre, sérum physiologique en dosettes', 'Mouche-bébé électrique'],
  ], [1600, 4519, 3519]),
  ...bullets([
    'Peu de taille naissance : la plupart des bébés passent en 1 mois en quelques semaines.',
    'L’occasion, oui, sauf le **matelas** (toujours neuf) et le **siège auto** (seulement si vous connaissez son histoire : pas d’accident).',
    'Réducteurs de lit, cale-bébé et coussins anti-tête plate sont **déconseillés** pour dormir.',
  ]),
  h2('Un couchage sûr : la règle du lit vide'),
  ...table(['Règle', 'Pourquoi'], [
    ['Sur le dos, toujours', 'Jamais sur le ventre ni sur le côté, pendant toute la première année.'],
    ['Un matelas ferme, à la bonne taille', 'Sans espace entre le matelas et les barreaux.'],
    ['Son propre lit', 'Pas de lit d’adulte, de canapé ni de fauteuil.'],
    ['Dans votre chambre', 'Au moins pendant les 6 premiers mois.'],
    ['Un lit vide', 'Ni oreiller, ni couette, ni tour de lit, ni peluche.'],
    ['Une gigoteuse', 'Adaptée à sa taille et à la saison, à la place d’une couverture.'],
    ['18 à 20 °C', 'Une chambre non surchauffée, pas de bonnet pour dormir.'],
    ['Zéro tabac', 'Ni pendant la grossesse, ni dans le logement.'],
  ], [3200, 6438]),
  h2('Le siège auto'),
  ...bullets([
    'Norme **R129 (i-Size)**, seule autorisée à la vente depuis septembre 2024.',
    '**Dos à la route** obligatoirement jusqu’à 15 mois au moins, et idéalement plus longtemps.',
    'Coque (cosy) de la naissance à 12-15 mois, ou siège évolutif.',
    'Fixation Isofix de préférence ; à l’avant, **airbag passager désactivé**.',
    '**Entraînez-vous à l’installer avant la naissance** : c’est le premier trajet qui compte.',
    'Pas de manteau épais sous le harnais : la couverture se met par-dessus.',
  ]),
  ...kine('Le cosy, c’est pour la voiture', [
    'Arrivé à destination, bébé sort du cosy : il dort dans son lit et joue sur un tapis. Les longues périodes dans le cosy, le transat ou la balancelle favorisent la tête plate et limitent ses mouvements.',
  ]),
  h2('La valise de maternité'),
  p('À préparer **dès le début du 8e mois** (vers 32 SA), au cas où bébé arriverait en avance. Demandez la liste de votre maternité : certaines fournissent les couches ou les vêtements des premiers jours.'),
  h3('Pour la salle de naissance'),
  ...bullets([
    'Une tenue confortable (grand tee-shirt), des chaussettes chaudes',
    'Brumisateur, baume à lèvres, élastique pour les cheveux',
    'Une bouteille d’eau, des en-cas pour le partenaire',
    'Téléphone, chargeur avec un long câble, une playlist',
    'Une tenue pour bébé : body, pyjama, bonnet, chaussettes, gigoteuse',
  ]),
  h3('Pour la maman'),
  ...bullets([
    'Chemises de nuit ou pyjamas qui s’ouvrent devant (pratique pour allaiter)',
    'Culottes jetables ou en filet, serviettes hygiéniques spéciales maternité',
    '2 soutiens-gorge d’allaitement, coussinets d’allaitement',
    'Trousse de toilette, serviette, chaussons, peignoir',
    'Une tenue ample pour la sortie',
  ]),
  h3('Pour bébé (pour 4 à 5 jours)'),
  ...bullets([
    '6 bodies et 6 pyjamas, en taille naissance et 1 mois',
    '2 bonnets, chaussettes, 2 gilets',
    '1 gigoteuse, des bavoirs ou langes',
    'Une tenue de sortie adaptée à la saison',
    'Le siège auto installé dans la voiture pour le retour',
  ]),
  h3('Les papiers'),
  ...bullets([
    'Pièce d’identité, carte Vitale, carte de mutuelle',
    'Dossier de grossesse : résultats de prises de sang, échographies, carte de groupe sanguin',
    'Livret de famille si vous êtes mariés, ou acte de reconnaissance anticipée',
    'Courrier ou dossier de la maternité',
  ]),
  ...retenir([
    'Une dizaine d’articles suffit pour les premières semaines.',
    'Lit vide, sur le dos, dans votre chambre.',
    'Siège auto R129 dos à la route, installé avant la naissance.',
    'Valise prête au début du 8e mois.',
  ]),
  ...note('Reprendre la mise en page des fiches du module Bébé 1 existant (liste d’achats, chambre sûre, siège auto) et ajouter la fiche « Ma valise de maternité », demandée par Serena.'),
);

// ===== Leçon 9 — bleu canard =====
content.push(
  ...lecon({
    num: 9, titre: 'Le couple et l’organisation',
    q: 'Comment on s’organise, tous les deux, avant que bébé arrive ?',
    objectifs: [
      'Trouver sa place de futur parent, quand on ne porte pas le bébé',
      'Connaître ses droits : congés, aides, démarches',
      'Choisir un mode de garde et s’inscrire à temps',
      'Préparer l’après-naissance pour ne pas s’épuiser',
    ],
    format: 'vidéo de 7 minutes, idéalement face caméra à deux + fiche « Avant le jour J ».',
    accent: C.canard, surface: C.brume, parents: true,
  }),
  h2('Le partenaire : une place à prendre dès maintenant', C.canard),
  p('Le parent qui ne porte pas le bébé le vit souvent de l’extérieur, et peut se sentir spectateur. Pourtant, il a un vrai rôle dès la grossesse :'),
  ...bullets([
    'venir aux échographies et à certains rendez-vous (autorisation d’absence pour **3 examens** prénataux s’il est salarié) ;',
    'participer à la préparation à la naissance et à l’entretien prénatal ;',
    'parler à bébé, le sentir bouger, apprendre les gestes de soin ;',
    'prendre en charge des sujets entiers : démarches, achats, chambre, valise.',
  ]),
  h2('Les congés', C.canard),
  ...table(['Congé', 'Durée et règles principales'], [
    ['Congé maternité (1er ou 2e enfant)', '16 semaines : 6 avant la date prévue d’accouchement et 10 après. Une partie du congé prénatal peut être reportée après la naissance, avec accord médical.'],
    ['Congé maternité (3e enfant et plus)', '26 semaines : 8 avant et 18 après.'],
    ['Jumeaux / triplés', '34 / 46 semaines.'],
    ['Congé du second parent', '28 jours au total : 3 jours de congé de naissance + 25 jours de congé de paternité et d’accueil de l’enfant (32 jours pour des naissances multiples). 7 jours sont obligatoires juste après la naissance ; le reste se prend dans les 6 mois. Prévenir l’employeur au moins un mois avant la date prévue.'],
  ], [3200, 6438], C.canard),
  ...note('À VÉRIFIER avant publication : un nouveau « congé de naissance » a été annoncé pour les deux parents. Mettre à jour ce tableau selon les règles en vigueur sur service-public.fr.'),
  h2('Les démarches à prévoir', C.canard),
  ...table(['Quand', 'Démarche'], [
    ['Pendant la grossesse', 'Reconnaissance anticipée en mairie si vous n’êtes pas mariés (pour le second parent).'],
    ['Pendant la grossesse', 'Prévenir la CAF et la mutuelle ; vérifier vos droits à la **prime à la naissance** (sous conditions de ressources, versée au cours du 7e mois de grossesse).'],
    ['Pendant la grossesse', 'Choisir le nom de famille de bébé, et un médecin pour lui (pédiatre ou généraliste).'],
    ['Avant la naissance', 'Contacter une sage-femme pour le suivi à domicile après la maternité, repérer la PMI la plus proche.'],
    ['Dans les 5 jours après la naissance', 'Déclarer la naissance à la mairie du lieu de naissance (souvent possible depuis la maternité).'],
    ['Après la naissance', 'Ajouter bébé sur votre carte Vitale et votre mutuelle ; prévenir la CAF.'],
  ], [3000, 6638], C.canard),
  h2('Le mode de garde : y penser tôt', C.canard),
  ...table(['Mode de garde', 'À savoir'], [
    ['Crèche', 'Les places sont rares dans certaines villes : renseignez-vous auprès de la mairie dès la grossesse.'],
    ['Assistante maternelle', 'Liste disponible auprès de la PMI ou du relais petite enfance. Une aide de la CAF (complément de libre choix du mode de garde) réduit le coût.'],
    ['Garde à domicile ou partagée', 'Plus souple, plus coûteuse ; aides et crédit d’impôt possibles.'],
  ], [3000, 6638], C.canard),
  p('Le site **monenfant.fr** (CAF) recense les modes d’accueil près de chez vous et permet d’estimer le coût.'),
  h2('Le couple pendant la grossesse', C.canard),
  ...bullets([
    '**La sexualité** n’est pas dangereuse pour bébé pendant une grossesse normale. Le désir peut varier dans les deux sens : en parler sans pression. Votre suivi vous dira si une précaution est nécessaire.',
    '**Les émotions** : joie, doutes, peurs, parfois une grande anxiété. La dépression peut aussi survenir pendant la grossesse : tristesse qui dure, perte d’envie, idées noires = en parler à votre sage-femme ou médecin.',
    '**Préparer l’après** : qui pourra aider les premières semaines (repas, courses, aînés) ? Quelles règles pour les visites ? Comment se répartir les nuits ?',
    '**Cuisiner et congeler** une dizaine de repas simples avant la naissance.',
  ]),
  ...callout({
    title: 'Si vous vivez des violences', fill: C.brume, titleColor: C.canard,
    body: ['La grossesse est une période où les violences dans le couple peuvent apparaître ou s’aggraver. Vous pouvez en parler à votre sage-femme ou médecin, en toute confidentialité, ou appeler le **3919** (gratuit, anonyme, 24 h/24). En cas de danger immédiat : **17**.'],
  }),
  ...retenir([
    'Le partenaire a sa place dès la grossesse : rendez-vous, préparation, démarches.',
    'Congé du second parent : 28 jours, dont 7 obligatoires à la naissance.',
    'Mode de garde : se renseigner dès la grossesse.',
    'Préparer l’après-naissance : aide, visites, repas congelés.',
  ]),
  ...note('Fiche « Avant le jour J » (reprise du module Bébé 1) + fiche « Qui fait quoi ? » à remplir à deux. Chiffres des congés et de la prime à vérifier sur service-public.fr et caf.fr avant publication.'),
);

// ===== Leçon 10 =====
content.push(
  ...lecon({
    num: 10, titre: 'Quand consulter et fiches à imprimer',
    q: 'Est-ce que je dois aller aux urgences ou attendre mon rendez-vous ?',
    objectifs: [
      'Savoir quand aller à la maternité sans attendre',
      'Savoir quand appeler sa sage-femme ou son médecin rapidement',
      'Repartir avec toutes les fiches pratiques de l’étape',
    ],
    format: 'page PDF « Quand consulter » à garder sur le frigo + dossier de fiches à télécharger.',
  }),
  ...alerte('Allez à la maternité ou appelez le 15 sans attendre si…', [
    'vous avez des **saignements**, même peu abondants ;',
    'vous perdez du **liquide** (poche des eaux) ;',
    'vous avez des **contractions régulières avant 37 SA** ;',
    'votre bébé **bouge moins** ou ne bouge plus (3e trimestre) ;',
    'vous avez des **maux de tête intenses**, des troubles de la vue (mouches, flashs), une douleur en haut du ventre, ou un gonflement brutal du visage et des mains (signes possibles de pré-éclampsie) ;',
    'vous avez de la **fièvre** (38 °C ou plus) ;',
    'vous avez une **douleur au ventre intense** ou qui ne passe pas ;',
    'vous avez fait une **chute** ou reçu un choc sur le ventre.',
  ]),
  ...callout({
    title: 'Appelez votre sage-femme ou votre médecin rapidement si…', fill: C.miel,
    list: [
      'vous vomissez beaucoup et ne gardez rien, ou vous perdez du poids ;',
      'vous avez des brûlures en urinant ;',
      'vous avez des démangeaisons intenses, surtout sur les paumes des mains et la plante des pieds ;',
      'vous avez une douleur ou un gonflement d’un seul mollet ;',
      'vous avez des pertes inhabituelles (odeur, couleur, démangeaisons).',
    ],
  }),
  ...callout({
    title: 'Et pour votre moral', fill: C.rose, titleColor: C.framboise,
    body: ['Une tristesse qui dure plus de deux semaines, une anxiété permanente, des difficultés à dormir même quand vous le pouvez, des idées noires : **parlez-en**, à votre sage-femme, votre médecin ou la PMI. Cela se soigne, et vous n’êtes pas seule.'],
  }),
  h2('Les numéros utiles'),
  ...table(['Numéro', 'Pour quoi'], [
    ['15 (ou 112)', 'Urgence médicale (SAMU)'],
    ['Maternité', 'Le numéro direct des urgences obstétricales de votre maternité, à noter dès l’inscription'],
    ['3919', 'Violences conjugales : écoute gratuite et anonyme, 24 h/24'],
    ['39 89', 'Tabac Info Service'],
    ['0 800 00 34 56', 'Allô Parents Bébé (Enfance et Partage) : questions des futurs et jeunes parents'],
  ], [2600, 7038]),
  ...note('Numéros à revérifier avant publication.'),
  h2('Les fiches à imprimer de l’étape 0'),
  ...table(['Fiche', 'Contenu', 'Leçon'], [
    ['Mes premières démarches', 'Checklist : 1re consultation, déclaration, maternité, B9, mutuelle, employeur', '2'],
    ['Mon calendrier de grossesse', 'Tous les rendez-vous et examens, avec date prévue et date faite', '3'],
    ['Mes exercices de grossesse', '4 exercices illustrés + les gestes pour protéger son dos', '4'],
    ['Bébé mois par mois', 'Frise de la taille et des étapes de bébé', '5'],
    ['Au frigo : oui / non', 'Les aliments à éviter et leurs remplaçants', '6'],
    ['Quand partir à la maternité', 'Les signes du travail et les règles des 5 minutes', '7'],
    ['Mon projet de naissance', 'Modèle à remplir', '7'],
    ['Ma liste d’achats essentiels', 'Checklist de l’équipement indispensable', '8'],
    ['Ma chambre est-elle sûre ?', 'Les 8 règles du couchage', '8'],
    ['Mon siège auto est-il bien installé ?', 'Checklist d’installation', '8'],
    ['Ma valise de maternité', 'Salle de naissance, maman, bébé, papiers', '8'],
    ['Avant le jour J', 'Organisation, démarches et « qui fait quoi »', '9'],
    ['Quand consulter + mes numéros utiles', 'À garder sur le frigo', '10'],
    ['Mes questions pour le prochain rendez-vous', 'Page de notes', 'Toutes'],
  ], [3300, 5138, 1200]),
);

// Sources
content.push(
  new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: 'SOURCES ET AVERTISSEMENT', font: TEXTE, bold: true, color: C.terracotta, size: 16, characterSpacing: 40 })], spacing: { after: 120 } }),
  h1('Sources à citer'),
  p('Ce contenu s’appuie sur les recommandations officielles en vigueur en France. Il a une visée d’information et ne remplace pas l’avis d’une sage-femme, d’un médecin ou d’un professionnel de santé.'),
  ...bullets([
    '**Haute Autorité de Santé (HAS)** : suivi et orientation des femmes enceintes ; dépistage de la trisomie 21 ; préparation à la naissance et à la parentalité.',
    '**Assurance maladie (ameli.fr)** : examens obligatoires, prise en charge, déclaration de grossesse, congé maternité.',
    '**Service-public.fr** : congés maternité et paternité, déclaration de naissance, reconnaissance anticipée.',
    '**CAF (caf.fr, monenfant.fr)** : prime à la naissance, modes de garde.',
    '**Santé publique France / 1000-premiers-jours.fr** : alimentation, alcool, tabac, couchage, livret des 1000 premiers jours.',
    '**ANSES** : recommandations alimentaires (listériose, toxoplasmose, poissons).',
    '**CRAT (lecrat.fr)** : médicaments et grossesse.',
    '**Collège national des gynécologues et obstétriciens français (CNGOF)** et **Collège national des sages-femmes** : diabète gestationnel, activité physique, prévention des lésions périnéales.',
    '**Prévention routière** et réglementation européenne R129 : sécurité en voiture.',
  ]),
  ...callout({
    label: 'Dans la prochaine étape', title: 'Étape 1 · Le nouveau-né', fill: C.terracotta, titleColor: C.blanc, textColor: C.blanc,
    body: ['« Il pleure sans arrêt, c’est normal ? »'],
  }),
);

// ---------- Document ----------
const doc = new Document({
  creator: 'Petit Bout de Famille',
  title: 'Étape 0 — Avant la naissance — Contenus des leçons',
  styles: {
    default: { document: { run: { font: TEXTE, size: 21, color: C.brun } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: TITRE, size: 40, bold: true, color: C.brun }, paragraph: { outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: TITRE, size: 28, bold: true, color: C.brun }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'puces', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } }, run: { color: C.terracotta } } }] },
      { reference: 'num-t21', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } }, run: { color: C.terracotta, bold: true } } }] },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Petit Bout de Famille · Étape 0 · Avant la naissance    ', font: TEXTE, size: 15, color: C.brun }),
          new TextRun({ children: [PageNumber.CURRENT], font: TEXTE, size: 16, bold: true, color: C.terracotta }),
        ],
      })] }),
    },
    children: content,
  }],
});

const out = path.join(__dirname, 'Etape-0-Avant-la-naissance.docx');
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log('OK', out); });
