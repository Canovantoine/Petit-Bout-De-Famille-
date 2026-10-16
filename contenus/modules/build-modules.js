// Génère les modules mis en page (HTML + PDF A4) à partir des textes en Markdown.
// Usage : node contenus/modules/build-modules.js [1 2 3] [--final]
//   --final : masque les notes de relecture et les mentions « À vérifier ».
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR = __dirname;
const FINAL = process.argv.includes('--final');
const WANTED = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);

// ---------- Réglages par module ----------
const MODULES = {
  1: {
    court: 'La grossesse', titre: 'La <em>grossesse</em>', sub: 'Pendant la grossesse',
    themes: { '1.9': 'canard' },
    next: { titre: 'Module 2 · L\'accouchement', q: '« Comment je vais savoir que c\'est le moment ? »' },
    insertChap11: true,
  },
  2: {
    court: 'L\'accouchement', titre: 'L\'<em>accouchement</em>', sub: 'La naissance et la maternité',
    themes: {},
    next: { titre: 'Module 3 · Le post-partum', q: '« Et moi, comment je vais ? »' },
  },
  3: {
    court: 'Le post-partum', titre: 'Le <em>post-partum</em>', sub: 'Prendre soin de soi',
    themes: { '3.1': 'framboise', '3.2': 'framboise', '3.3': 'framboise', '3.4': 'framboise', '3.5': 'framboise', '3.6': 'canard', '3.7': 'canard' },
    next: { titre: 'Module 4 · Le nouveau-né', q: '« Il pleure sans arrêt, c\'est normal ? »' },
  },
};

// ---------- Pictos (trait brun, remplissage chaud) ----------
const ICONS = {
  star: '<path d="M24 4 l6 13 14 2 -10 10 3 14 -13 -7 -13 7 3 -14 -10 -10 14 -2z" fill="#F9C74F"/>',
  heart: '<path d="M24 42S6 31 6 18a9 9 0 0 1 18-4 9 9 0 0 1 18 4c0 13-18 24-18 24z" fill="#F6B48A"/>',
  moon: '<path d="M30 6a18 18 0 1 0 12 28A15 15 0 1 1 30 6z" fill="#F9C74F"/>',
  sun: '<circle cx="24" cy="24" r="9" fill="#F9C74F"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4" fill="none" stroke-linecap="round"/>',
  cloud: '<path d="M12 36a9 9 0 0 1 1-18 12 12 0 0 1 23 2 8 8 0 0 1 1 16z" fill="#FFFFFF"/>',
  calendar: '<rect x="8" y="10" width="32" height="30" rx="5" fill="#FBE3A1"/><path d="M8 19h32M16 6v8M32 6v8" fill="none" stroke-linecap="round"/><circle cx="24" cy="29" r="3" fill="#F6B48A"/>',
  phone: '<path d="M14 6h8l3 10-5 3a24 24 0 0 0 9 9l3-5 10 3v8a4 4 0 0 1-4 4C21 38 10 27 10 10a4 4 0 0 1 4-4z" fill="#F9C74F"/>',
  apple: '<path d="M24 14c-8-6-18 0-16 12 2 10 8 16 12 16 2 0 3-1 4-1s2 1 4 1c4 0 10-6 12-16 2-12-8-18-16-12z" fill="#F6B48A"/><path d="M24 14c0-4 2-8 6-9" fill="none" stroke-linecap="round"/>',
  bag: '<rect x="8" y="16" width="32" height="24" rx="5" fill="#FBE3A1"/><path d="M17 16v-4a7 7 0 0 1 14 0v4" fill="none"/>',
  home: '<path d="M8 22 24 8l16 14v18H8z" fill="#FCD9C4"/><rect x="20" y="28" width="8" height="12" fill="#F9C74F"/>',
};
const ICON_ORDER = ['star', 'heart', 'moon', 'sun', 'cloud', 'calendar', 'apple', 'bag', 'home', 'phone'];
const icon = (name, size = 15) => `<svg class="deco-ico" width="${size}mm" height="${size}mm" viewBox="0 0 48 48" stroke="#3D2B1F" stroke-width="3" stroke-linejoin="round">${ICONS[name]}</svg>`;

// ---------- Markdown → blocs ----------
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function clean(s) {
  return s.replace(/\\([\[\]\.\)\(!\-#*_])/g, '$1').replace(/\s+$/, '');
}
function inline(s) {
  s = esc(clean(s));
  s = s.replace(/\*\*\[(À vérifier[^\]]*)\]\*\*/g, (m, t) => FINAL ? '' : `<span class="verif">${t}</span>`);
  s = s.replace(/\[(À vérifier[^\]]*)\]/g, (m, t) => FINAL ? '' : `<span class="verif">${t}</span>`);
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<i>$2</i>');
  s = s.replace(/(\d)(er|re|e)\b(?=[\s,.;:)])/g, '$1<sup>$2</sup>');
  return s.trim();
}

// Découpe le texte d'un chapitre en blocs (paragraphes, listes, tableaux).
function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim() || /^-{3,}$/.test(l.trim())) { i++; continue; }
    if (/^\s*\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = rows.filter(r => !/^\s*\|\s*:?-/.test(r)).map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      const body = cells.filter(r => r.some(c => c));
      out.push({ type: 'table', head: body[0], rows: body.slice(1) });
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lines.length && (/^\s*([-*]|\d+\.)\s/.test(lines[i]))) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        const depth = m[1].length >= 2 ? 1 : 0;
        if (depth && items.length) (items[items.length - 1].sub ||= []).push(m[3]);
        else items.push({ text: m[3] });
        i++;
      }
      out.push({ type: ordered ? 'ol' : 'ul', items });
      continue;
    }
    out.push({ type: 'p', text: l });
    i++;
  }
  return out;
}

function renderBlocks(bs) {
  return bs.map(b => {
    if (b.type === 'p') {
      const t = clean(b.text);
      if (/^\*\*\[À vérifier/.test(t)) return FINAL ? '' : `<p class="verif-line">${inline(b.text)}</p>`;
      if (/^\*Note pour la relecture/.test(t) || /^\*Le contenu détaillé/.test(t)) return FINAL ? '' : `<div class="relecture"><span class="tag">Note de relecture</span>${inline(b.text.replace(/^\*|\*$/g, ''))}</div>`;
      return `<p>${inline(b.text)}</p>`;
    }
    if (b.type === 'ul' || b.type === 'ol') {
      const tag = b.type;
      return `<${tag}${tag === 'ol' ? ' class="steps"' : ''}>${b.items.map(it => `<li>${inline(it.text)}${it.sub ? `<ul>${it.sub.map(s => `<li>${inline(s)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</${tag}>`;
    }
    if (b.type === 'table') {
      const head = b.head.map(h => `<th>${inline(h.replace(/\*\*/g, ''))}</th>`).join('');
      const rows = b.rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
      return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
    }
    return '';
  }).join('\n');
}

// Un titre de section est une ligne entièrement en gras.
const isHeading = l => /^\*\*[^*]+\*\*\s*$/.test(l.trim()) && !/À vérifier/.test(l);

function parseModule(md) {
  const lines = md.split('\n');
  const mod = { chapters: [], intro: [] };
  let cur = null;
  for (const raw of lines) {
    const l = raw.replace(/\s+$/, '');
    if (/^# /.test(l)) { mod.title = clean(l.slice(2)); continue; }
    if (/^## /.test(l)) {
      const m = clean(l.slice(3)).match(/^Chapitre (\d+\.\d+) — (.*)$/);
      cur = { num: m[1], title: m[2].replace(/^« | »$/g, ''), isQuestion: /^«/.test(m[2]), lines: [] };
      mod.chapters.push(cur);
      continue;
    }
    if (cur) cur.lines.push(l); else mod.intro.push(l);
  }
  // Question d'accroche et objectif du module
  const introText = mod.intro.filter(l => l.trim());
  mod.question = clean(introText.find(l => /^\*«/.test(l)) || '').replace(/^\*|\*$/g, '');
  const obj = introText.find(l => /^Objectif du module/.test(l));
  mod.objectif = obj ? inline(obj.replace(/^Objectif du module : (.)/, (m, c) => c.toUpperCase())) : '';
  // Sources (dernière ligne du dernier chapitre)
  const last = mod.chapters[mod.chapters.length - 1];
  const si = last.lines.findIndex(l => /^\*\*Sources/.test(l));
  if (si >= 0) { mod.sources = inline(last.lines[si].replace(/^\*\*Sources à consulter pour la relecture\*\* : /, '')); last.lines = last.lines.slice(0, si); }
  // Sections de chaque chapitre
  for (const ch of mod.chapters) {
    ch.sections = [];
    let sec = { title: null, lines: [] };
    for (const l of ch.lines) {
      if (/^\*\(Chapitre en/.test(l.trim())) continue;
      if (isHeading(l)) { if (sec.title || sec.lines.some(x => x.trim())) ch.sections.push(sec); sec = { title: clean(l.trim().replace(/^\*\*|\*\*$/g, '')), lines: [] }; continue; }
      sec.lines.push(l);
    }
    ch.sections.push(sec);
  }
  return mod;
}

// ---------- Rendu HTML ----------
function sectionKind(title, chapNum, isLastChap) {
  if (!title) return 'plain';
  if (/^Ce qu'il faut savoir/.test(title)) return 'lead';
  if (/^Concrètement/.test(title)) return 'concret';
  if (/^L'espace du kiné/.test(title)) return 'kine';
  if (/^Appelez le 15|^Après la naissance, chez la mère/.test(title)) return 'urgence';
  if (/^Les fiches à imprimer/.test(title)) return 'fiches';
  if (/^(Quand consulter|Quand demander de l'aide|Quand partir|Quand et à qui|Allez à la maternité|Contactez|Consultez|Parlez-en|Chez bébé|Pendant la fin de grossesse)/.test(title)) return 'alert';
  return 'card';
}

const CARD_CYCLE = ['blanc', 'acc-surf', 'miel', 'rose'];

function renderChapter(ch, m, idx) {
  const theme = m.cfg.themes[ch.num] || '';
  const isLast = idx === m.chapters.length - 1;
  let cardI = 0;
  const parts = ch.sections.map(sec => {
    const kind = sectionKind(sec.title, ch.num, isLast);
    const bs = blocks(sec.lines);
    const body = renderBlocks(bs);
    const size = sec.lines.join(' ').length;
    const avoid = size < 1100 ? ' avoid' : '';
    if (!sec.title) return body ? `<div class="plain">${body}</div>` : '';
    const t = inline(sec.title);
    switch (kind) {
      case 'lead': return `<div class="card acc-surf lead${avoid}"><span class="tag">Ce qu'il faut savoir</span>${body}</div>`;
      case 'concret': return `<div class="card miel${avoid}"><span class="tag">Concrètement</span>${body}</div>`;
      case 'kine': return `<div class="dark${avoid}"><span class="badge soleil">L'espace du kiné</span>${body}</div>`;
      case 'urgence': return `<div class="urgence${avoid}"><div class="num15">15<small>ou le 112</small></div><div><h3>${t}</h3>${body}</div></div>`;
      case 'alert': return `<div class="alert${avoid}"><h3>${t}</h3>${body}</div>`;
      case 'fiches': return `<div class="card miel${avoid}"><span class="tag">À imprimer</span><h3>${t}</h3>${body}</div>`;
      default: {
        const c = CARD_CYCLE[cardI++ % CARD_CYCLE.length];
        return `<div class="card ${c}${avoid}"><h3>${t}</h3>${body}</div>`;
      }
    }
  }).join('\n');
  const ico = ICON_ORDER[idx % ICON_ORDER.length];
  const title = ch.isQuestion ? `« ${inline(ch.title)} »` : inline(ch.title);
  const parentsBadge = theme ? '<span class="badge">Vous, les parents</span>' : '';
  return `
<section class="chap ${theme}">
  <header class="chap-head">
    <div class="circle c1"></div><div class="circle c2"></div>${icon(ico)}
    ${parentsBadge}
    <div class="kicker">Module ${m.num} · Chapitre ${ch.num} · ${esc(m.cfg.court)}</div>
    <h2>${title}</h2>
  </header>
  <div class="stack">${parts}</div>
</section>`;
}

function renderCover(m) {
  const chips = m.chapters.map((c, i) => `<div class="card ${['peche', 'miel', 'blanc', 'rose'][i % 4]}"><b>${c.num}</b> ${inline(c.title.replace(/^« | »$/g, ''))}</div>`).join('');
  return `
<section class="cover">
  <div class="circle" style="width:150mm;height:150mm;background:var(--peche);right:-55mm;top:-30mm"></div>
  <div class="circle" style="width:62mm;height:62mm;background:var(--miel);right:58mm;top:-26mm"></div>
  <div class="circle" style="width:85mm;height:85mm;background:var(--rose);left:-38mm;bottom:-42mm"></div>
  <div class="dashed" style="width:26mm;height:26mm;right:22mm;top:118mm"></div>
  <svg class="mobile" width="62mm" height="55mm" viewBox="0 0 200 180" fill="none" stroke="#3D2B1F" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="100" y1="0" x2="100" y2="22" stroke="#B9502C"/><path d="M18 40 Q100 4 182 40" stroke="#B9502C"/>
    <line x1="30" y1="36" x2="30" y2="92" stroke="#B9502C" stroke-dasharray="4 5"/><line x1="100" y1="22" x2="100" y2="112" stroke="#B9502C" stroke-dasharray="4 5"/><line x1="170" y1="36" x2="170" y2="76" stroke="#B9502C" stroke-dasharray="4 5"/>
    <path d="M30 92 l6 13 14 2 -10 10 2 14 -12 -7 -12 7 2 -14 -10 -10 14 -2z" fill="#F9C74F"/>
    <path d="M112 116 a20 20 0 1 0 6 30 a16 16 0 1 1 -6 -30z" fill="#F6B48A"/>
    <path d="M152 92 a10 10 0 0 1 10 -14 a13 13 0 0 1 24 4 a9 9 0 0 1 2 18 h-32 a8 8 0 0 1 -4 -8z" fill="#FFFFFF"/>
  </svg>
  <div class="cover-in">
    <span class="badge">Module ${m.num}</span><span class="sub">${esc(m.cfg.sub)}</span>
    <h1 class="cover-title">${m.cfg.titre}</h1>
    <p class="question">${esc(m.question)}</p>
    <p class="objectif">${m.objectif}</p>
    ${FINAL ? '' : '<p class="draft">Version de travail du 16/10/2026 · à relire avant la vente</p>'}
    <div class="in-module"><h4>Dans ce module</h4><div class="grid2">${chips}</div></div>
  </div>
</section>`;
}

function renderEnd(m) {
  return `
<section class="chap end">
  <header class="chap-head"><div class="circle c1"></div>
    <div class="kicker">Sources et avertissement</div><h2>Pour aller plus loin</h2></header>
  <div class="stack">
    <div class="card blanc"><h3>Sources officielles</h3><p>${m.sources || ''}</p><p class="small">Les calendriers, montants et droits évoluent : vérifiez toujours la version en vigueur sur ameli.fr, service-public.fr, caf.fr et has-sante.fr.</p></div>
    <div class="alert"><h3>Note de prudence</h3><p>Ce module est un support d'information. Il ne remplace pas une consultation, une prescription ni l'avis d'une sage-femme, d'un médecin ou d'un professionnel de santé. En cas d'urgence, appelez le <b>15</b> ou le <b>112</b>.</p></div>
    <div class="card next"><div class="kicker">Dans le prochain module</div><h3>${esc(m.cfg.next.titre)}</h3><p><i>${esc(m.cfg.next.q)}</i></p></div>
  </div>
</section>`;
}

// ---------- Fiches pratiques à imprimer ----------
const lines = n => `<div class="lines">${'<div>&nbsp;</div>'.repeat(n)}</div>`;
const checks = items => items.map(t => `<div class="check"><span class="box"></span><span>${t}</span></div>`).join('');
function fiche({ title, intro, body, head = 'miel', ico = 'star' }) {
  return `
<section class="chap fiche">
  <div class="fiche-head ${head}"><span class="badge">Fiche pratique</span><h2>${title}</h2><p>${intro}</p>${icon(ico, 16)}</div>
  ${body}
</section>`;
}
function grid(cols, rows, widths) {
  return `<table class="grid"><thead><tr>${cols.map((c, i) => `<th style="width:${widths ? widths[i] : 'auto'}">${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map((c, i) => `<td>${r[i] || ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
const FICHES = {
  1: [
    fiche({ title: 'Mon calendrier de grossesse', ico: 'calendar', intro: 'Notez les dates prévues, cochez quand c\'est fait. À garder dans votre dossier de grossesse.',
      body: grid(['Examen', 'Quand', 'Date prévue', 'Fait le'], [
        ['1<sup>re</sup> consultation, déclaration', 'Avant la fin du 3<sup>e</sup> mois'], ['Prises de sang du début', '1<sup>er</sup> trimestre'], ['1<sup>re</sup> échographie', '11 à 13 SA + 6 j'], ['Entretien prénatal précoce', '1<sup>er</sup> trimestre'], ['Inscription à la maternité', '1<sup>er</sup> trimestre'], ['Consultation du 4<sup>e</sup> mois', '4<sup>e</sup> mois'], ['Examen bucco-dentaire', 'Dès le 4<sup>e</sup> mois'], ['Consultation du 5<sup>e</sup> mois', '5<sup>e</sup> mois'], ['2<sup>e</sup> échographie', '20 à 25 SA'], ['Dépistage du diabète (si besoin)', '24 à 28 SA'], ['Consultation du 6<sup>e</sup> mois, prise de sang', '6<sup>e</sup> mois'], ['Consultation du 7<sup>e</sup> mois', '7<sup>e</sup> mois'], ['3<sup>e</sup> échographie', '30 à 35 SA'], ['Vaccins (coqueluche, VRS, grippe)', 'Selon le calendrier'], ['Consultation d\'anesthésie', '8<sup>e</sup> mois'], ['Consultation du 8<sup>e</sup> mois', '8<sup>e</sup> mois'], ['Prélèvement vaginal (strepto B)', '34 à 38 SA'], ['Consultation du 9<sup>e</sup> mois', '9<sup>e</sup> mois'],
      ].map(r => [r[0], r[1], '', '<span class="box"></span>']), ['42%', '26%', '20%', '12%']) }),
    fiche({ title: 'Ma valise de maternité', ico: 'bag', head: 'peche', intro: 'À préparer vers le 7<sup>e</sup> mois. Vérifiez la liste de votre maternité : certaines fournissent couches et linge.',
      body: `<div class="grid2"><div><h3>Pour moi</h3>${checks(['Dossier de grossesse et résultats', 'Carte Vitale, mutuelle, pièce d\'identité', 'Livret de famille ou reconnaissance anticipée', 'Chemises de nuit ou grands t-shirts', 'Culottes jetables ou en coton', 'Serviettes hygiéniques maternité', 'Soutiens-gorge d\'allaitement, coussinets', 'Affaires de toilette, serviette', 'Chaussons, chaussettes', 'Tenue confortable pour la sortie', 'Eau, collations, chargeur de téléphone'])}</div><div><h3>Pour bébé</h3>${checks(['6 bodys taille naissance et 1 mois', '6 pyjamas', '2 gilets', '1 bonnet, chaussettes', '2 gigoteuses', 'Une tenue de sortie', 'Une couverture pour le siège auto', 'Le siège auto installé dans la voiture'])}<div class="card rose small" style="margin-top:3mm">Préparez aussi un petit sac pour la salle de naissance : brumisateur, élastique à cheveux, musique, collation pour l'accompagnant.</div></div></div>` }),
    fiche({ title: 'Mon projet de naissance', ico: 'heart', intro: 'Une page pour exprimer vos souhaits, à discuter avec la sage-femme vers le 8<sup>e</sup> mois. C\'est un projet, pas un contrat.',
      body: ['Qui m\'accompagne', 'Ce que je souhaite pour gérer la douleur', 'Les positions, l\'ambiance (lumière, musique, bain…)', 'Le peau à peau et le premier repas de bébé (sein, biberon)', 'Si une césarienne est nécessaire', 'Ce qui est important pour moi, ce que je redoute'].map(t => `<div class="card blanc tight"><h3>${t}</h3>${lines(2)}</div>`).join('') }),
    fiche({ title: 'Mon carnet de glycémies', ico: 'apple', head: 'peche', intro: 'En cas de diabète gestationnel : notez vos résultats et apportez ce carnet à chaque rendez-vous.',
      body: grid(['Jour', 'À jeun', 'Après le petit-déj.', 'Après le déjeuner', 'Après le dîner', 'Repas, activité, remarques'], ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(j => [j]), ['14%', '12%', '15%', '15%', '14%', '30%']) + `<div class="card rose small" style="margin-top:4mm">Objectifs habituels : moins de 0,95 g/L à jeun et moins de 1,20 g/L deux heures après le début du repas. Suivez ceux que votre équipe vous a donnés.</div>` }),
  ],
  2: [
    fiche({ title: 'Les signes du travail : quand partir ?', ico: 'phone', intro: 'À afficher dans l\'entrée en fin de grossesse. En cas de doute, appelez la maternité : vous ne dérangez jamais.',
      body: `<div class="urgence avoid"><div class="num15">!</div><div><h3>Partez sans attendre si :</h3><ul><li>vous perdez les eaux, même sans contraction ;</li><li>le liquide est teinté, vert ou marron ;</li><li>vous saignez ;</li><li>bébé bouge moins ;</li><li>vous avez de la fièvre, un malaise, une douleur intense et continue ;</li><li>les contractions sont régulières avant 37 SA.</li></ul></div></div>
      <div class="card miel avoid"><h3>Les contractions</h3><p><b>Premier bébé</b> : toutes les 5 minutes environ depuis 1 à 2 heures. <b>Bébé suivant</b> : souvent dès qu'elles reviennent toutes les 10 minutes.</p></div>
      <div class="card blanc"><h3>Je note mes contractions</h3>${grid(['Heure de début', 'Durée', 'Écart avec la précédente', 'Intensité (1 à 5)'], Array.from({ length: 9 }, () => []))}</div>
      <div class="card blanc tight"><h3>Ma maternité</h3>${lines(1)}</div>` }),
    fiche({ title: 'Accouchement inopiné : les 5 gestes', ico: 'star', head: 'peche', intro: 'Rare, mais possible. À garder près du téléphone dans les dernières semaines.',
      body: `<ol class="big-steps"><li><b>Appelez le 15.</b> Le médecin vous guide au téléphone et envoie une équipe.</li><li><b>Installez-vous</b> confortablement (semi-assise, sur le côté ou à quatre pattes), sur des serviettes propres.</li><li><b>Ne tirez jamais</b> sur bébé ni sur le cordon : laissez-le sortir à son rythme.</li><li><b>Peau à peau</b> : posez bébé sur le ventre de sa mère, séchez-le, couvrez-le avec la tête, vérifiez que son visage est dégagé et qu'il respire.</li><li><b>Ne coupez pas le cordon</b> et n'essayez pas de faire sortir le placenta : l'équipe s'en charge.</li></ol><div class="card rose small">Restez calme et parlez à bébé : votre voix le rassure. L'équipe arrive.</div>` }),
    fiche({ title: 'Mes questions à la maternité', ico: 'cloud', intro: 'À cocher pendant le séjour, et à compléter avec vos propres questions.',
      body: `<div class="grid2"><div><h3>À demander à l'équipe</h3>${checks(['Comment savoir si bébé mange assez ?', 'Comment le coucher en sécurité ?', 'Comment soigner le cordon ?', 'Comment soigner mon périnée ou ma cicatrice ?', 'Quels médicaments puis-je prendre (et en allaitant) ?', 'Quand revoir une sage-femme, un médecin ?', 'Qui appeler en cas de souci ?', 'Quels signes doivent me faire revenir ?'])}</div><div><h3>Avant la sortie</h3>${checks(['Carnet de santé de bébé rempli', 'Ordonnances pour moi et pour bébé', 'Compte rendu de sortie et résultats', 'Déclaration de naissance faite (5 jours)', 'Rendez-vous sage-femme à domicile', 'Rendez-vous pédiatre ou médecin', 'Siège auto installé dos à la route', 'Contraception discutée'])}</div></div><div class="card blanc tight"><h3>Mes autres questions</h3>${lines(4)}</div>` }),
  ],
  3: [
    fiche({ title: 'Les signes d\'alerte après la naissance', ico: 'phone', head: 'peche', intro: 'À afficher et à montrer à l\'entourage. Ces signes ne veulent pas forcément dire qu\'il y a un problème, mais ils doivent être évalués vite.',
      body: `<div class="urgence avoid"><div class="num15">15<small>ou le 112</small></div><div><h3>Appelez le 15 sans attendre</h3><ul><li>Saignements très abondants : une serviette remplie en moins d'une heure, gros caillots.</li><li>Malaise, essoufflement, douleur dans la poitrine.</li><li>Maux de tête violents, troubles de la vue.</li><li>Confusion, propos étranges, agitation, plus de sommeil du tout.</li><li>Idées de se faire du mal ou de faire du mal à bébé (ou le 3114).</li></ul></div></div>
      <div class="alert avoid"><h3>Consultez dans la journée</h3><ul><li>Fièvre à 38 °C ou plus.</li><li>Mollet rouge, chaud, douloureux.</li><li>Cicatrice rouge, gonflée, qui suinte.</li><li>Saignements qui sentent mauvais, douleur qui augmente.</li><li>Sein rouge, chaud, douloureux.</li><li>Impossibilité d'uriner, perte du contrôle des selles.</li></ul></div>
      <div class="card blanc tight"><h3>Mes numéros</h3><div class="lines"><div>Ma sage-femme : ……………………………………………</div><div>Ma maternité : ……………………………………………</div><div>Ma PMI : ……………………………………………</div><div>3114 (prévention du suicide) · 3919 (violences) · 3237 (pharmacie de garde)</div></div></div>` }),
    fiche({ title: 'Baby blues ou dépression ?', ico: 'cloud', intro: 'Pour repérer ce qui passe seul et ce qui demande de l\'aide. À partager avec l\'autre parent et l\'entourage.',
      body: `<div class="grid2"><div class="card miel"><span class="pill-h" style="background:var(--terracotta)">Baby blues</span><ul><li>Très fréquent : la majorité des mères.</li><li>Entre le 3<sup>e</sup> et le 10<sup>e</sup> jour.</li><li>Larmes, sautes d'humeur, inquiétude.</li><li>Passe seul en quelques jours, deux semaines au maximum.</li><li>Ce qui aide : repos, soutien, écoute.</li></ul></div><div class="card rose"><span class="pill-h" style="background:var(--brun)">Il faut en parler</span><ul><li>Tristesse ou vide plus de deux semaines.</li><li>Plus de plaisir pour rien.</li><li>Épuisement qui ne cède pas au repos.</li><li>Anxiété envahissante, pensées effrayantes.</li><li>Culpabilité, sentiment d'être une mauvaise mère.</li><li>Chez l'autre parent : irritabilité, retrait, fuite dans le travail ou l'alcool.</li></ul></div></div><div class="alert avoid"><h3>À qui en parler ?</h3><p>Sage-femme, médecin traitant, PMI. Idées noires : <b>3114</b>, gratuit, 24 h/24, ou le <b>15</b>. Cela se soigne, et plus tôt on en parle, plus vite on va mieux.</p></div>` }),
    fiche({ title: 'Notre répartition des tâches et des nuits', ico: 'home', head: 'peche', intro: 'À remplir à deux. Celui qui prend une tâche y pense, l\'organise et la fait. On réajuste chaque semaine.',
      body: grid(['Tâche', 'Qui ?', 'Quand ?', 'Remarques'], ['Nuits (semaine)', 'Nuits (week-end)', 'Repas', 'Courses', 'Linge', 'Ménage', 'Rendez-vous médicaux', 'Papiers (CAF, mutuelle…)', 'Bain et change de bébé', 'Visites et famille', 'Aînés, animaux', 'Un moment pour chacun'].map(t => [t]), ['32%', '18%', '20%', '30%']) }),
    fiche({ title: 'Mes exercices des premières semaines', ico: 'sun', intro: 'Allongée sur le dos, genoux pliés, sans douleur. Cochez chaque jour : 5 minutes suffisent.',
      body: `<ol class="big-steps"><li><b>La respiration abdominale</b> : inspirez en laissant le ventre se gonfler, expirez lentement en rentrant doucement le nombril. 10 respirations.</li><li><b>Le réveil du périnée</b> : en expirant, contractez comme pour retenir une envie d'uriner, tenez 3 à 5 secondes, relâchez complètement. 10 fois.</li><li><b>La bascule du bassin</b> : en expirant, rentrez le ventre et collez doucement le bas du dos au sol ; relâchez en inspirant. 10 fois.</li></ol>${grid(['Semaine', 'L', 'M', 'M', 'J', 'V', 'S', 'D'], [1, 2, 3, 4, 5, 6].map(n => [`Semaine ${n}`, ...Array(7).fill('<span class="box"></span>')]))}<div class="card rose small" style="margin-top:3mm">Le réflexe à garder : <b>je souffle avant l'effort</b>. Avant de porter bébé, de tousser ou de soulever, expirez en contractant le périnée.</div>` }),
  ],
};

// ---------- Chapitre 1.1 détaillé (pages fixes existantes) ----------
function chapter11() {
  const src = fs.readFileSync(path.join(DIR, '..', 'Module-1-Chapitre-1-1-Test-positif.html'), 'utf8');
  const css = src.match(/<style>([\s\S]*?)<\/style>/)[1]
    .replace(/@page\{[^}]*\}/g, '').replace(/@media print\{[\s\S]*?\}\}/g, '');
  // Préfixe chaque sélecteur par .c11 pour éviter les conflits de styles.
  const scoped = css.replace(/(^|\})\s*([^{}@]+)\{/g, (m, close, sel) => {
    const s = sel.split(',').map(x => x.trim()).filter(Boolean).map(x => {
      if (x === ':root') return ':root';
      if (x === 'body') return '.c11';
      return `.c11 ${x}`;
    }).join(',');
    return `${close}\n${s}{`;
  });
  const pages = src.match(/<section class="page[^"]*">[\s\S]*?<\/section>/g);
  // Pages 2 à 15 : on retire la couverture et la page sources du chapitre.
  return { css: scoped, html: `<div class="c11">${pages.slice(1, 15).join('\n')}</div>` };
}

// ---------- Feuille de style des modules ----------
const CSS = `
:root{--creme:#FFF4E8;--blanc:#FFFFFF;--brun:#3D2B1F;--terracotta:#B9502C;--brique:#8A3A1F;--soleil:#F9C74F;--abricot:#F6B48A;--peche:#FCD9C4;--miel:#FBE3A1;--rose:#F8D5CF;--framboise:#9E3D57;--canard:#2E6670;--brume:#D6E8EA;--accent:var(--terracotta);--accent-surface:var(--peche)}
@page{size:A4;margin:15mm 16mm 19mm;background:#FFF4E8;
  @bottom-left{content:"Petit Bout de Famille · MODULE_LABEL";font-family:"Nunito ExtraLight",Nunito;font-weight:400;font-size:7pt;color:#3D2B1F;vertical-align:middle}
  @bottom-right{content:counter(page);font-family:"Nunito ExtraLight",Nunito;font-weight:800;font-size:7.5pt;color:#fff;background:#B9502C;border-radius:50%;width:7mm;height:7mm;text-align:center;vertical-align:middle;margin-top:5mm;margin-bottom:7mm}}
@page full{margin:0;@bottom-left{content:none}@bottom-right{content:none;background:none}}
*{box-sizing:border-box;margin:0;padding:0}
html{background:#FFF4E8}
body{font-family:'Nunito',sans-serif;color:var(--brun);font-size:9.6pt;line-height:1.5}
.framboise{--accent:var(--framboise);--accent-surface:var(--rose)}
.canard{--accent:var(--canard);--accent-surface:var(--brume)}
h1,h2,h3{font-family:'Fredoka',sans-serif;font-weight:700;line-height:1.15}
h2{font-size:21pt;margin:1mm 0 0;max-width:140mm}
h3{font-size:11.5pt;font-weight:600;margin-bottom:1.5mm;break-after:avoid}
p+p{margin-top:1.8mm}
b{font-weight:800}
sup{line-height:0;font-size:.7em}
ul,ol{padding-left:4.5mm;margin-top:1mm}
li{margin:.8mm 0}
li::marker{color:var(--accent);font-weight:800}
li ul{margin-top:.5mm}
p+ul,p+ol,ul+p,ol+p,table+p,p+table{margin-top:1.8mm}
.small{font-size:8.4pt}
.kicker{font-weight:800;font-size:7pt;letter-spacing:.12em;text-transform:uppercase;margin:2mm 0 2.5mm;color:var(--brun)}
.badge{display:inline-block;background:var(--accent);color:#fff;font-weight:800;font-size:7.5pt;letter-spacing:.1em;text-transform:uppercase;padding:1.6mm 4mm;border-radius:999px}
.badge.soleil{background:var(--soleil);color:var(--brun);margin-bottom:2mm}
.tag{display:block;font-weight:800;font-size:7pt;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:1.2mm}
.circle{position:absolute;border-radius:50%;z-index:-1}
.dashed{position:absolute;border-radius:50%;border:2px dashed var(--accent);opacity:.6}
/* Chapitres */
.chap{break-before:page;position:relative}
.chap-head{position:relative;padding:4mm 32mm 5mm 0;min-height:30mm;overflow:hidden}
.chap-head .c1{width:62mm;height:62mm;background:var(--accent-surface);right:-30mm;top:-34mm}
.chap-head .c2{width:14mm;height:14mm;background:var(--miel);right:36mm;top:-4mm}
.chap.framboise .chap-head .c2,.chap.canard .chap-head .c2{background:var(--miel)}
.chap-head .deco-ico{position:absolute;right:4mm;top:6mm}
.stack>*+*{margin-top:3.5mm}
.card{border-radius:14px;padding:4mm 5mm;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.avoid{break-inside:avoid}
.blanc{background:var(--blanc)}.peche{background:var(--peche)}.miel{background:var(--miel)}.rose{background:var(--rose)}.acc-surf{background:var(--accent-surface)}
.lead{font-size:10pt}
.dark{background:var(--brun);color:#FFF4E8;border-radius:14px;padding:4.5mm 6mm;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.dark li::marker{color:var(--soleil)}
.dark i{color:var(--soleil);font-style:normal;font-family:'Fredoka';font-weight:600;font-size:11pt}
.alert{background:var(--blanc);border:1.5px solid var(--accent);border-radius:14px;padding:4mm 5.5mm;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.alert h3{color:var(--accent)}
.urgence{background:var(--brique);color:#fff;border-radius:14px;padding:4.5mm 6mm;display:flex;gap:5mm;align-items:flex-start}
.urgence .num15{flex:none;width:18mm;height:18mm;border-radius:50%;background:#fff;color:var(--brique);display:grid;place-items:center;text-align:center;font-family:'Fredoka';font-weight:700;font-size:19pt;line-height:.9}
.urgence .num15 small{display:block;font-family:'Nunito';font-size:6.5pt;font-weight:800}
.urgence h3{color:#fff}.urgence li::marker{color:var(--soleil)}
.next{background:var(--terracotta);color:#fff}.next h3{color:#fff;font-size:15pt}.next .kicker{color:#fff;margin:0 0 1mm}
.verif{display:inline-block;background:var(--soleil);color:var(--brun);font-size:7pt;font-weight:800;padding:.3mm 2mm;border-radius:999px;line-height:1.5;vertical-align:1px}
.verif-line{margin-top:1.5mm}
.relecture{border:1.5px dashed var(--abricot);border-radius:12px;padding:2.5mm 4mm;font-size:8.4pt;background:rgba(255,255,255,.5)}
.relecture .tag{color:var(--brique)}
ol.steps{list-style:none;padding:0;counter-reset:st}
ol.steps>li{counter-increment:st;position:relative;padding-left:9mm;margin:2mm 0}
ol.steps>li::before{content:counter(st);position:absolute;left:0;top:-.3mm;width:6.5mm;height:6.5mm;border-radius:50%;background:var(--accent);color:#fff;font-weight:800;font-size:8pt;display:grid;place-items:center}
.dark ol.steps>li::before{background:var(--soleil);color:var(--brun)}
table{width:100%;border-collapse:separate;border-spacing:0 1.3mm;font-size:8.6pt;line-height:1.4;margin-top:1mm}
thead{display:table-header-group}
tr{break-inside:avoid}
th{text-align:left;font-weight:800;font-size:7.6pt;padding:0 3mm;color:var(--accent);text-transform:uppercase;letter-spacing:.05em}
td{background:var(--creme);padding:2.2mm 3mm;vertical-align:top}
.card.blanc td,.alert td{background:var(--creme)}
.card.miel td,.card.rose td,.card.acc-surf td,.card.peche td{background:var(--blanc)}
td:first-child{border-radius:10px 0 0 10px;font-weight:800}
.chap table:not(.grid) td:first-child{background:var(--accent);color:#fff}
td:last-child{border-radius:0 10px 10px 0}
/* Couverture */
.cover{page:full;position:relative;width:210mm;height:297mm;overflow:hidden;background:var(--creme)}
.cover .circle{z-index:0}
.cover-in{position:relative;z-index:1;padding:20mm 16mm 0}
.cover .mobile{position:absolute;right:14mm;top:86mm;z-index:1}
.sub{font-weight:700;font-size:8.5pt;margin-left:2mm}
.cover-title{font-size:46pt;margin:12mm 0 6mm;max-width:125mm}
.cover-title em{font-style:normal;color:var(--accent)}
.question{font-style:italic;font-size:13pt;max-width:115mm}
.objectif{max-width:118mm;margin-top:5mm;font-size:9.4pt}
.draft{display:inline-block;margin-top:4mm;font-size:7.5pt;font-weight:800;background:var(--soleil);padding:1mm 3mm;border-radius:999px}
.in-module{position:absolute;left:16mm;right:16mm;top:170mm}
.in-module h4{font-weight:800;font-size:10pt;margin-bottom:3mm}
.in-module .grid2{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm}
.in-module .card{padding:2.4mm 4mm;font-weight:700;font-size:8.6pt;border-radius:12px;line-height:1.3}
.in-module .card b{color:var(--accent);margin-right:1.5mm}
/* Fiches */
.fiche .fiche-head{position:relative;border-radius:18px;padding:6mm 34mm 6mm 6mm;margin-bottom:5mm}
.fiche-head h2{margin:3mm 0 1.5mm;font-size:20pt}
.fiche-head p{font-weight:700;font-size:9pt}
.fiche-head .deco-ico{position:absolute;right:8mm;top:8mm}
.fiche>*+*{margin-top:3.5mm}
.fiche .grid2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.check{display:flex;gap:3.5mm;align-items:center;background:var(--blanc);border-radius:11px;padding:2.4mm 4mm;margin-bottom:2mm;font-size:9pt}
.box{display:inline-block;flex:none;width:4.6mm;height:4.6mm;border:1.8px solid var(--terracotta);border-radius:4px;vertical-align:middle}
.lines div{border-bottom:1.5px dotted var(--abricot);padding:3.6mm 0 1mm;font-size:9pt}
.tight{padding:3mm 5mm}.tight h3{margin-bottom:0}
.fiche .card.tight+.card.tight{margin-top:2.5mm}
table.grid td{background:var(--blanc);height:8.5mm}
table.grid td:first-child{background:var(--peche);color:var(--brun)}
table.grid td:has(.box){text-align:center}
.pill-h{display:inline-block;color:#fff;font-weight:800;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;padding:1.2mm 3.5mm;border-radius:999px;margin-bottom:2mm}
ol.big-steps{list-style:none;padding:0;counter-reset:bs}
ol.big-steps>li{counter-increment:bs;position:relative;background:var(--blanc);border-radius:14px;padding:4mm 5mm 4mm 17mm;margin-bottom:3mm;font-size:10pt}
ol.big-steps>li::before{content:counter(bs);position:absolute;left:4mm;top:3.5mm;width:9mm;height:9mm;border-radius:50%;background:var(--terracotta);color:#fff;font-family:'Fredoka';font-weight:700;font-size:13pt;display:grid;place-items:center}
/* Chapitre 1.1 inséré (pages fixes) */
.c11{page:full}
.c11 .page{margin:0 !important;break-after:page}
`;

// Les pieds de page (marges @page) utilisent les polices du système : on installe Nunito localement.
function installFonts() {
  const home = require('os').homedir();
  const dest = path.join(home, '.fonts');
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(path.join(DIR, 'fonts'))) if (f.endsWith('-latin.woff')) fs.copyFileSync(path.join(DIR, 'fonts', f), path.join(dest, f));
  try { require('child_process').execSync('fc-cache -f', { stdio: 'ignore' }); } catch (e) { /* facultatif */ }
}

async function build(num) {
  const md = fs.readFileSync(path.join(DIR, `module-${num}.md`), 'utf8');
  const m = parseModule(md);
  m.num = num; m.cfg = MODULES[num];
  let c11 = null;
  let chapters = m.chapters.map((c, i) => ({ c, i }));
  if (m.cfg.insertChap11) { c11 = chapter11(); chapters = chapters.filter(x => x.c.num !== '1.1'); }
  const label = `Module ${num} · ${m.cfg.court}`;
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Petit Bout de Famille — Module ${num} · ${esc(m.cfg.court)}</title>
<link rel="stylesheet" href="fonts/fonts-local.css">
<style>${CSS.replace('MODULE_LABEL', label)}${c11 ? c11.css : ''}</style></head>
<body>
${renderCover(m)}
${c11 ? c11.html : ''}
${chapters.map(({ c, i }) => renderChapter(c, m, i)).join('\n')}
${(FICHES[num] || []).join('\n')}
${renderEnd(m)}
</body></html>`;
  const htmlPath = path.join(DIR, `Module-${num}.html`);
  fs.writeFileSync(htmlPath, html);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pdfPath = path.join(DIR, `Module-${num}${FINAL ? '' : '-relecture'}.pdf`);
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  console.log('OK', path.relative(process.cwd(), pdfPath));
}

(async () => {
  installFonts();
  for (const n of (WANTED.length ? WANTED : [1, 2, 3])) await build(n);
})();
