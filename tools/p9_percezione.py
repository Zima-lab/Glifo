"""Figure 1–13 — correzioni ottiche e percezione della forma.

Una figura per concetto, pensata per stare in testa alla voce di Tecnica che
la spiega: sul telefono una tavola con tre esempi diventa illeggibile, una
figura sola no. Formato 640 px, cornice e carta delle altre tavole.

Regola: dove la figura riporta un numero, il numero è MISURATO sul contorno
vero del glifo (intersezione con una retta), mai scritto a occhio. Dove una
correzione è esagerata per renderla visibile, la didascalia lo dichiara.

Esegue: python3 p9_percezione.py  →  ../plates/perc-01 … perc-13.svg
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from lib import *
from glyphs import glyph_path, glyph_bounds, _font
from fontTools.pens.basePen import BasePen

FD = APP + '/fonts/specimen/'
SANS  = FD + 'archivo-700-latin.woff2'
SANSM = FD + 'archivo-500-latin.woff2'
SERIF = FD + 'libre-caslon-text-400-latin.woff2'
BOOK  = FD + 'libre-baskerville-400-latin.woff2'
EPS = 0.37      # la retta di misura non deve cadere su un vertice
W = 640
MEAS = {}

# ── misura sul contorno ─────────────────────────────────────────────────
class _Flat(BasePen):
    def __init__(self, gs):
        super().__init__(gs); self.segs = []; self.p = self.s = None
    def _moveTo(self, p): self.p = self.s = p
    def _lineTo(self, p): self.segs.append((self.p, p)); self.p = p
    def _curveToOne(self, a, b, c):
        p0 = self.p
        for i in range(1, 25):
            t = i/24; u = 1-t
            q = (u**3*p0[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t**3*c[0],
                 u**3*p0[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t**3*c[1])
            self.segs.append((self.p, q)); self.p = q
    def _closePath(self):
        if self.p != self.s: self.segs.append((self.p, self.s))

def _segs(font, ch):
    f = _font(font); gs = f.getGlyphSet(); pen = _Flat(gs)
    gs[f.getBestCmap()[ord(ch)]].draw(pen)
    return pen.segs

def cut_h(font, ch, y):
    xs = []
    for (x0, y0), (x1, y1) in _segs(font, ch):
        if (y0-y)*(y1-y) < 0: xs.append(x0 + (y-y0)*(x1-x0)/(y1-y0))
    return sorted(xs)

def cut_v(font, ch, x):
    ys = []
    for (x0, y0), (x1, y1) in _segs(font, ch):
        if (x0-x)*(x1-x) < 0: ys.append(y0 + (x-x0)*(y1-y0)/(x1-x0))
    return sorted(ys)

def upm(font): return _font(font)['head'].unitsPerEm
def capu(font): return _font(font)['OS/2'].sCapHeight
def xhu(font): return _font(font)['OS/2'].sxHeight
def adv_u(font, ch):
    f = _font(font); return f['hmtx'][f.getBestCmap()[ord(ch)]][0]

# ── disegno ─────────────────────────────────────────────────────────────
def gl(ch, size, x, y, font=SANS, sw=1.8, hatch='h1', fill=None):
    d, adv = glyph_path(font, ch, size, x, y)
    out = ''
    if fill: out += f'<path d="{d}" fill="{fill}"/>'
    elif hatch: out += f'<path d="{d}" fill="url(#{hatch})" opacity="0.30"/>'
    out += f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return out, adv

def word(txt, size, x, y, font=SANS, **kw):
    out = ''; 
    for ch in txt:
        g, a = gl(ch, size, x, y, font, **kw); out += g; x += a
    return out, x

def word_width(txt, size, font=SANS):
    return sum(adv_u(font, c) for c in txt) * size / upm(font)

def guide(x1, x2, y):
    return ink(wobble_line(x1, y, x2, y, 0.3), 0.9, RED, dash='5 4')

def shape(d, fill='url(#h2)', op=0.32, w=1.8):
    return f'<path d="{d}" fill="{fill}" opacity="{op}"/>' + ink(d, w)

def bar_h(x1, x2, y):
    return (ink(wobble_line(x1, y, x2, y, 0.15), 1.6, RED) +
            ink(wobble_line(x1, y-6, x1, y+6, 0.1), 1.1, RED) +
            ink(wobble_line(x2, y-6, x2, y+6, 0.1), 1.1, RED))

def bar_v(x, y1, y2):
    return (ink(wobble_line(x, y1, x, y2, 0.15), 1.5, RED) +
            ink(wobble_line(x-5, y1, x+5, y1, 0.1), 1.0, RED) +
            ink(wobble_line(x-5, y2, x+5, y2, 0.1), 1.0, RED))

def note(x, y, t, anchor='middle', color=INK2, size=11):
    return label(x, y, t, anchor, size, color, style='italic')

def caption(lines, y0, H):
    out = ink(wobble_line(50, y0 - 22, W - 50, y0 - 22, 0.5), 0.9, INK2)
    for i, t in enumerate(lines):
        out += note(W/2, y0 + i*17, t, size=11.5)
    return out

def save(n, slug, H, body, title, subtitle):
    seeded(100 + n)
    svg = plate(W, H, body, title=title, subtitle=subtitle, figno=f'Fig. {n}')
    open(f'{APP}/plates/perc-{n:02d}-{slug}.svg', 'w').write(svg)

def rect(x, y, w, h): return f'M {x},{y} L {x+w},{y} L {x+w},{y+h} L {x},{y+h} Z'

# ═══ 1 · SORMONTO ═══════════════════════════════════════════════════════
seeded(1); b = []
XS = [155, 265, 375, 485]; HALF = 40; EX = 2
for top, base, corr, t1 in ((118, 188, 0, 'geometricamente uguali: cerchio e triangoli sembrano più piccoli'),
                            (240, 310, 1, 'otticamente uguali: le forme tonde e appuntite superano le linee')):
    b += [guide(80, 560, top), guide(80, 560, base)]
    h = base - top; orr = 0.03*h*EX*corr; op = 0.06*h*EX*corr
    b.append(shape(f'M {XS[0]-HALF},{base} L {XS[0]},{top-op} L {XS[0]+HALF},{base} Z'))
    b.append(shape(rect(XS[1]-35, top, 70, h)))
    r = h/2 + orr; cx, cy = XS[2], (top+base)/2
    b.append(shape(f'M {cx-r},{cy} A {r},{r} 0 1,0 {cx+r},{cy} A {r},{r} 0 1,0 {cx-r},{cy} Z'))
    b.append(shape(f'M {XS[3]-HALF},{top} L {XS[3]+HALF},{top} L {XS[3]},{base+op} Z'))
    b.append(note(W/2, base + 24 + (6 if corr else 0), t1, color=RED if corr else INK2))
S = 102; k = S/upm(SANS); B0 = 440; C0 = B0 - capu(SANS)*k
b += [guide(80, 560, C0), guide(80, 560, B0)]
g, _ = word('AHOV', S, W/2 - word_width('AHOV', S)/2, B0); b.append(g)
ob = glyph_bounds(SANS, 'O', upm(SANS)); ov = (ob[3]-capu(SANS))/capu(SANS)*100
MEAS['sormonto O Archivo %'] = round(ov, 2)
b.append(note(W/2, B0 + 24, f'in un carattere vero (Archivo Bold) la O supera ciascuna linea dell\'{ov:.1f} %'.replace("dell'1", "dell'1")))
b.append(caption(['Nelle forme geometriche le correzioni sono raddoppiate per renderle visibili.',
                  'Nelle lettere sono quelle vere: poche unità, ma senza di esse la O sembrerebbe rimpicciolita.'], 505, 560))
save(1, 'sormonto', 560, ''.join(b), 'IL SORMONTO', 'Perché la O è più alta della H')

# ═══ 2 · LA O NON È UNA H ══════════════════════════════════════════════
seeded(2); b = []
S = 190; k = S/upm(SANS); B0 = 320; C0 = B0 - capu(SANS)*k
b += [guide(50, 590, C0), guide(50, 590, B0)]
aH = adv_u(SANS, 'H')*k; aO = adv_u(SANS, 'O')*k
X0 = W/2 - (2*aH + aO)/2
for ch, x in (('H', X0), ('O', X0+aH), ('H', X0+aH+aO)):
    g, _ = gl(ch, S, x, B0, sw=2.0); b.append(g)
cu = capu(SANS)
xh = cut_h(SANS, 'H', cu*0.25 + EPS); stem = xh[1]-xh[0]
xo = cut_h(SANS, 'O', (ob[1]+ob[3])/2 + EPS); curve = xo[1]-xo[0]
MEAS['asta H'] = round(stem); MEAS['curva O'] = round(curve)
b.append(bar_h(X0+xh[0]*k, X0+xh[1]*k, B0 - cu*0.25*k))
b.append(bar_h(X0+aH+xo[0]*k, X0+aH+xo[1]*k, B0 - (ob[1]+ob[3])/2*k))
b.append(note(X0+(xh[0]+xh[1])/2*k, B0+24, 'asta 100', color=RED))
b.append(note(X0+aH+(xo[0]+xo[1])/2*k, B0+24, f'curva {curve/stem*100:.0f}', color=RED))
ox = X0 + aH + aO/2
b.append(leader(ox+90, C0-30, ox+6, B0 - ob[3]*k + 1))
b.append(note(ox+94, C0-33, f'sopra la linea: +{ov:.1f} %', 'start', RED))
b.append(leader(ox+90, B0+44, ox+6, B0 - ob[1]*k - 1))
b.append(note(ox+94, B0+48, f'sotto la base: +{-ob[1]/cu*100:.1f} %', 'start', RED))
b.append(caption(['Una curva tocca la linea in un punto solo, un\'asta per tutta la sua larghezza.',
                  'Se fossero uguali, la O sembrerebbe più piccola e più chiara della H: per questo',
                  'è disegnata un po\' più alta e un po\' più spessa. Misure sull\'Archivo Bold.'], 420, 490))
save(2, 'o-e-h', 490, ''.join(b), 'LA O NON È UNA H', 'Altezza e spessore delle curve')

# ═══ 3 · GLI INNESTI ═══════════════════════════════════════════════════
seeded(3); b = []
def vjoint(x0, yt, yb, w, span, drop=0.0, trap=0.0):
    t = (span - w/2) / span; cy = yt + t*(yb-yt) + drop
    pts = [(x0-span-w/2, yt), (x0-span+w/2, yt)]
    if trap: pts += [(x0-7, cy-3), (x0, cy+trap), (x0+7, cy-3)]
    else: pts += [(x0, cy)]
    pts += [(x0+span-w/2, yt), (x0+span+w/2, yt), (x0+w/2*0.9, yb), (x0-w/2*0.9, yb)]
    return 'M ' + ' L '.join(f'{p[0]:.1f},{p[1]:.1f}' for p in pts) + ' Z'
for x0, drop, trap, t1, t2 in ((140, 0, 0, 'geometrico', 'nel nodo si addensa il nero'),
                               (320, 24, 0, 'assottigliato', 'il nero resta uniforme'),
                               (500, 24, 11, 'con ink trap', 'l\'incavo si riempirà d\'inchiostro')):
    b.append(shape(vjoint(x0, 118, 262, 38, 58, drop, trap), fill=INK, op=0.85))
    b.append(note(x0, 290, t1, color=RED if drop else INK2, size=12.5))
    b.append(note(x0, 307, t2))
S = 118; k = S/upm(SANS); B0 = 440; C0 = B0 - capu(SANS)*k
x = W/2 - word_width('NAV', S)/2
for ch, spots in (('N', [(0.14, 1.0), (0.86, 0.0)]), ('A', [(0.5, 1.0)]), ('V', [(0.5, 0.0)])):
    g, a = gl(ch, S, x, B0, fill=INK); b.append(g)
    bb = glyph_bounds(SANS, ch, S)
    for fx, fy in spots:
        px = x + bb[0] + (bb[2]-bb[0])*fx; py = B0 - (bb[1] + (bb[3]-bb[1])*fy)
        b.append(ink(wobble_circle(px, py, 15, 0.8), 1.4, RED))
    x += a
b.append(caption(['Dove due tratti si incontrano il nero si somma. Il disegnatore li assottiglia',
                  'vicino all\'innesto; nei caratteri per corpi piccoli o carta assorbente scava un',
                  'incavo, l\'ink trap, che l\'inchiostro colmerà in stampa. Schemi ingranditi.'], 505, 575))
save(3, 'innesti', 575, ''.join(b), 'GLI INNESTI', 'Dove i tratti si incontrano, il nero si addensa')

# ═══ 4 · STRETTO E LARGO ═══════════════════════════════════════════════
seeded(4); b = []
S = 117; k = S/upm(SANSM); LEN = 480; X0 = 80
pair = word_width('HO', S, SANSM)
for base, txt, lab in ((210, 'HOHOHOHO', 'stretto'), (345, 'HOHO', 'largo')):
    sx = LEN / (pair * len(txt)/2)
    C0 = base - capu(SANSM)*k
    b += [guide(60, 580, C0), guide(60, 580, base)]
    x = 0; gg = ''
    for ch in txt:
        d, a = glyph_path(SANSM, ch, S, x, 0)
        gg += (f'<path d="{d}" fill="url(#h1)" opacity="0.30"/>'
               f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="1.8" vector-effect="non-scaling-stroke"/>')
        x += a
    b.append(f'<g transform="translate({X0},{base}) scale({sx:.3f},1)">{gg}</g>')
    b.append(note(W/2, base + 24, f'{lab} — stesso corpo, stessa riga', color=RED if lab == 'largo' else INK2))
b.append(caption(['A parità di corpo e di lunghezza di riga, la composizione larga sembra più',
                  'grande e più nera. Qui le lettere sono deformate apposta: un vero carattere',
                  'stretto o largo è ridisegnato, perché schiacciarlo assottiglia le aste.'], 430, 500))
save(4, 'stretto-largo', 500, ''.join(b), 'STRETTO E LARGO', 'La larghezza cambia la grandezza apparente')

# ═══ 5 · LA LETTERA E IL SUO CAMPO ═════════════════════════════════════
seeded(5); b = []
S = 100; bbN = glyph_bounds(SANS, 'N', S)
def boxed_N(cx, cy, side, frame=1.6):
    o = ink(wobble_rect(cx-side/2, cy-side/2, side, side, 0.6), frame)
    x = cx - (bbN[0]+bbN[2])/2; y = cy + (bbN[1]+bbN[3])/2
    g, _ = gl('N', S, x, y, fill=INK); return o + g
b.append(boxed_N(210, 230, 220)); b.append(boxed_N(450, 230, 118))
b.append(note(210, 365, 'molto bianco intorno')); b.append(note(450, 365, 'poco bianco intorno'))
b.append(note(W/2, 390, 'le due N sono identiche', color=RED, size=12.5))
b.append(caption(['La lettera non si vede da sola: si vede insieme al bianco che la circonda.',
                  'Nel campo largo domina il bianco e la N sembra più piccola e più leggera.'], 445, 495))
save(5, 'campo', 495, ''.join(b), 'LA LETTERA E IL SUO CAMPO', 'Lo stesso segno in due spazi diversi')

# ═══ 6 · IL BIANCO E IL NERO ═══════════════════════════════════════════
seeded(6); b = []
b.append(ink(wobble_rect(120, 125, 170, 170, 0.6), 1.8))
b.append(f'<path d="{rect(350, 125, 170, 170)}" fill="{INK}"/>')
b.append(note(205, 322, 'quadrato bianco')); b.append(note(435, 322, 'quadrato nero'))
b.append(note(W/2, 348, 'stessa misura: il bianco sembra più grande', color=RED, size=12.5))
b.append(caption(['Il chiaro sembra espandersi oltre i suoi margini, lo scuro ritirarsi dentro i suoi.',
                  'Per lo stesso motivo un testo chiaro su fondo scuro appare più pesante',
                  'dello stesso testo scuro su fondo chiaro.'], 400, 465))
save(6, 'bianco-nero', 465, ''.join(b), 'IL BIANCO E IL NERO', 'Due quadrati uguali che non sembrano uguali')

# ═══ 7 · VERTICALI E ORIZZONTALI ═══════════════════════════════════════
seeded(7); b = []
SIDE, N, T = 150, 6, 10
gap = (SIDE - N*T) / (N-1)
for i in range(N):
    o = i*(T+gap)
    b.append(f'<path d="{rect(125+o, 118, T, SIDE)}" fill="{INK}"/>')
    b.append(f'<path d="{rect(365, 118+o, SIDE, T)}" fill="{INK}"/>')
b.append(note(200, 292, 'sembra più larga, linee più sottili'))
b.append(note(440, 292, 'sembra più alta, linee più spesse'))
S = 130; k = S/upm(SANS); B0 = 440; C0 = B0 - capu(SANS)*k
aH = adv_u(SANS, 'H')*k; X0 = W/2 - aH/2
g, _ = gl('H', S, X0, B0); b.append(g)
bbH = glyph_bounds(SANS, 'H', upm(SANS))
ysH = cut_v(SANS, 'H', (bbH[0]+bbH[2])/2 + EPS); bar = ysH[1]-ysH[0]
MEAS['traversa H'] = round(bar)
b.append(bar_h(X0 + xh[0]*k, X0 + xh[1]*k, B0 - cu*0.2*k))
b.append(bar_v(X0 + (bbH[0]+bbH[2])/2*k + 18, B0 - ysH[0]*k, B0 - ysH[1]*k))
b.append(note(X0 - 14, B0 - cu*0.2*k + 4, 'asta 100', 'end', RED))
b.append(note(X0 + aH + 14, B0 - (ysH[0]+ysH[1])/2*k + 4, f'traversa {bar/stem*100:.0f}', 'start', RED))
b.append(caption(['Due figure identiche, ruotate di un quarto di giro. Un tratto orizzontale',
                  'sembra più spesso di uno verticale di uguale misura: per questo nella H',
                  'dell\'Archivo Bold la traversa è disegnata più sottile dell\'asta.'], 510, 575))
save(7, 'verticali-orizzontali', 575, ''.join(b), 'VERTICALI E ORIZZONTALI', 'Lo stesso spessore non pesa allo stesso modo')

# ═══ 8 · LA H NEI DUE QUADRATI ═════════════════════════════════════════
seeded(8); b = []
S = 104; bbh = glyph_bounds(SANS, 'H', S)
for cx, fw in ((200, 0), (440, 22)):
    s = 170; x0, y0 = cx - s/2, 120
    if fw:
        b.append(f'<path d="{rect(x0, y0, s, s)} {rect(x0+fw, y0+fw, s-2*fw, s-2*fw)}" fill="{INK}" fill-rule="evenodd"/>')
    else:
        b.append(ink(wobble_rect(x0, y0, s, s, 0.5), 1.6))
    g, _ = gl('H', S, cx - (bbh[0]+bbh[2])/2, y0 + s/2 + (bbh[1]+bbh[3])/2, fill=INK); b.append(g)
b.append(note(200, 318, 'cornice sottile')); b.append(note(440, 318, 'cornice spessa'))
b.append(note(W/2, 344, 'H e quadrati sono identici', color=RED, size=12.5))
b.append(caption(['Cambia soltanto il nero intorno, e con lui la lettera: la cornice spessa',
                  'restringe il campo bianco e la H sembra di un\'altra grandezza.',
                  'Accade lo stesso a una lettera accanto a lettere più nere o più chiare.'], 400, 465))
save(8, 'cornice', 465, ''.join(b), 'LA H NEI DUE QUADRATI', 'Il nero che circonda la lettera la trasforma')

# ═══ 9 · PIÙ NERA, PIÙ BASSA ═══════════════════════════════════════════
seeded(9); b = []
EW, EH, GAP = 64, 150, 18; TOP = 125
x = W/2 - (6*EW + 5*GAP)/2
b += [guide(50, 590, TOP), guide(50, 590, TOP + EH)]
for i, t in enumerate((6, 11, 17, 23, 29, 35)):
    d = (rect(x, TOP, t, EH) + ' ' + rect(x, TOP, EW, t) + ' ' +
         rect(x, TOP + EH/2 - t/2, EW*0.84, t) + ' ' + rect(x, TOP + EH - t, EW, t))
    b.append(f'<path d="{d}" fill="{INK}" fill-rule="nonzero"/>')
    x += EW + GAP
b.append(note(W/2, 305, 'stessa altezza, stessa larghezza', color=RED, size=12.5))
b.append(caption(['Via via che l\'asta si ingrossa, la lettera sembra abbassarsi:',
                  'più bianco c\'è dentro una lettera, più essa appare alta.'], 360, 410))
save(9, 'peso-altezza', 410, ''.join(b), 'PIÙ NERA, PIÙ BASSA', 'Il peso cambia l\'altezza apparente')

# ═══ 10 · LA METÀ CHE SI LEGGE ═════════════════════════════════════════
seeded(10); b = []
S = 96; k = S/upm(BOOK); ww = word_width('Biblioteca', S, BOOK); X0 = W/2 - ww/2
defs = []
for i, (base, keep, lab, col) in enumerate(((200, 'top', 'metà superiore: si legge ancora', RED),
                                            (330, 'bot', 'metà inferiore: molto meno', INK2))):
    cut = base - xhu(BOOK)*k/2
    y0, hh = (base - 140, cut - (base - 140)) if keep == 'top' else (cut, 60)
    defs.append(f'<clipPath id="cl{i}"><rect x="0" y="{y0:.1f}" width="{W}" height="{hh:.1f}"/></clipPath>')
    g, _ = word('Biblioteca', S, X0, base, BOOK, sw=1.4, fill=INK)
    b.append(f'<g clip-path="url(#cl{i})">{g}</g>')
    b.append(ink(wobble_line(X0-20, cut, X0+ww+20, cut, 0.4), 1.0, RED, dash='4 4'))
    b.append(note(W/2, base + (-58 if keep == 'bot' else 34), lab, color=col, size=12.5) if keep == 'top' else note(W/2, cut + 58, lab, color=col, size=12.5))
b.insert(0, '<defs>' + ''.join(defs) + '</defs>')
b.append(caption(['Tagliata a metà dell\'altezza-x, la parola si riconosce dalla parte alta,',
                  'dove ascendenti, maiuscole e occhielli si distinguono fra loro.',
                  'È la ragione per cui la metà superiore di un carattere va curata più dell\'altra.'], 440, 505))
save(10, 'meta-superiore-lettura', 505, ''.join(b), 'LA METÀ CHE SI LEGGE', 'L\'occhio legge soprattutto la parte alta della riga')

# ═══ 11 · LE CONTROFORME ═══════════════════════════════════════════════
seeded(11); b = []
S = 180; k = S/upm(SANS); B0 = 300; C0 = B0 - capu(SANS)*k
ww = word_width('HBA', S); X0 = W/2 - ww/2
b.append(f'<path d="{rect(X0 - 18, C0, ww + 36, B0 - C0)}" fill="{INK}"/>')
g, xe = word('HBA', S, X0, B0, fill=PAPER, sw=1.6); b.append(g)
aH = adv_u(SANS, 'H')*k; bbB = glyph_bounds(SANS, 'B', S)
bx = X0 + aH + (bbB[0]+bbB[2])/2
b.append(leader(bx + 70, C0 - 30, bx - 4, B0 - (bbB[3]*0.72)))
b.append(note(bx + 74, C0 - 33, 'controforma interna', 'start', RED))
gx = X0 + aH - 6
b.append(leader(gx - 60, B0 + 36, gx, B0 - 30))
b.append(note(gx - 64, B0 + 42, 'controforma fra le lettere', 'end', RED))
b.append(caption(['In nero i bianchi: dentro le lettere e fra una lettera e l\'altra.',
                  'L\'occhio li valuta insieme alla forma, ed è sul loro equilibrio',
                  'che si giudica un carattere, più che sul disegno dei neri.'], 405, 470))
save(11, 'controforme', 470, ''.join(b), 'LE CONTROFORME', 'Il bianco fa parte della lettera')

# ═══ 12 · LA SPAZIATURA ════════════════════════════════════════════════
seeded(12); b = []
b.append('<defs><pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">'
         f'<circle cx="3" cy="3" r="1.25" fill="{RED}"/></pattern></defs>')
S = 170; k = S/upm(SERIF); B0 = 250; cuS = capu(SERIF); C0 = B0 - cuS*k
txt = 'HIOG'; ww = word_width(txt, S, SERIF); X0 = W/2 - ww/2
def edges(ch):
    """Bordo sinistro e destro del glifo a metà altezza, dove l'occhio
    misura lo spazio: le grazie, che sporgono, non contano."""
    xs = cut_h(SERIF, ch, cuS/2 + EPS)
    l, r = xs[0], xs[-1]
    if ch in 'OG':      # accanto a una curva il bianco entra nella lettera
        l += (xs[1]-xs[0])*0.85; r -= (xs[-1]-xs[-2])*0.85 if ch == 'O' else 0
    return l, r
x = X0; pos = []
for ch in txt:
    pos.append((ch, x)); x += adv_u(SERIF, ch)*k
for (c1, x1), (c2, x2) in zip(pos, pos[1:]):
    l = x1 + edges(c1)[1]*k; r = x2 + edges(c2)[0]*k
    b.append(f'<path d="{rect(l, C0, r - l, B0 - C0)}" fill="url(#dots)" opacity="0.8"/>')
for ch, x in pos:
    g, _ = gl(ch, S, x, B0, SERIF, fill=PAPER, sw=1.8); b.append(g)
b.append(note(W/2, B0 + 28, 'fra le lettere, volumi di bianco equivalenti — non distanze uguali', color=RED))
S2 = 80; k2 = S2/upm(SERIF); w2 = word_width(txt, S2, SERIF)
g, _ = word(txt, S2, 0, 0, SERIF, sw=1.3)
b.append(f'<g transform="translate({W/2 + w2/2},{385 - cuS*k2}) rotate(180)">{g}</g>')
b.append(note(W/2, 410, 'capovolta, la parola smette di leggersi e resta solo il ritmo dei bianchi'))
b.append(caption(['Fra due aste dritte il bianco è un rettangolo; accanto a una curva si allarga',
                  'in alto e in basso, e la lettera tonda va avvicinata. Si giudica meglio',
                  'a pagina capovolta, quando l\'occhio non riconosce più le parole.'], 465, 530))
save(12, 'spaziatura', 530, ''.join(b), 'LA SPAZIATURA', 'Lo spazio fra le lettere si misura in bianco, non in millimetri')

# ═══ 13 · LA METÀ SUPERIORE PIÙ PICCOLA ════════════════════════════════
seeded(13); b = []
S = 150; k = S/upm(SANS); B0 = 300; C0 = B0 - cu*k; MID = (B0 + C0)/2
b += [guide(50, 590, C0), guide(50, 590, B0)]
b.append(ink(wobble_line(50, MID, 590, MID, 0.3), 0.9, INK2, dash='2 4'))
b.append(note(54, MID - 6, 'metà', 'start', size=10))
txt = 'BS38'; GAPL = 26
ww = word_width(txt, S) + GAPL*3; x = W/2 - ww/2; ratios = []
for ch in txt:
    g, a = gl(ch, S, x, B0); b.append(g)
    bb = glyph_bounds(SANS, ch, upm(SANS)); cx = bb[0] + (bb[2]-bb[0])*0.5
    ys = cut_v(SANS, ch, cx + EPS)
    lo, hi = ys[2]-ys[1], ys[4]-ys[3]; ratios.append((ch, round(hi/lo*100)))
    for y1, y2 in ((ys[1], ys[2]), (ys[3], ys[4])):
        b.append(bar_v(x + cx*k, B0 - y1*k, B0 - y2*k))
    b.append(note(x + a/2, B0 + 24, f'{round(hi/lo*100)} : 100', color=RED))
    x += a + GAPL
MEAS['spazio alto:basso'] = ratios
b.append(caption(['Lo spazio chiuso in alto è più basso di quello in basso: la « vita » della',
                  'lettera sta sopra la metà. Se le due parti fossero uguali, la lettera',
                  'sembrerebbe capovolta, con la testa troppo grossa. Misure sull\'Archivo Bold.'], 385, 450))
save(13, 'meta-superiore', 450, ''.join(b), 'LA METÀ SUPERIORE', 'Perché la B non è simmetrica')

for kk, v in MEAS.items(): print(kk, v)
