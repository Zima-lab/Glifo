"""Tav. VIII — le correzioni ottiche.

Una lettera che sembra giusta non è geometricamente giusta. La tavola mostra
le tre correzioni più comuni, tutte presenti in qualsiasi carattere ben
disegnato:

  I.   il sormonto — le forme tonde e appuntite superano le linee;
  II.  la O non è una H — più alta e con le curve più spesse delle aste;
  III. la metà superiore è più stretta — la « vita » sta sopra il centro.

Le figure geometriche della parte I sono calcolate; le misure delle parti II
e III NON sono a occhio: si ricavano intersecando il contorno vero del glifo
con una retta, e il valore scritto sulla tavola è quello misurato.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from lib import *
from glyphs import glyph_path, glyph_bounds, _font
from fontTools.pens.basePen import BasePen

FD = APP + '/fonts/specimen/'
SANS = FD + 'archivo-700-latin.woff2'

# ── misura: intersezioni del contorno con una retta ──────────────────────
class _Flat(BasePen):
    """Appiattisce il contorno in segmenti, per poterlo intersecare."""
    def __init__(self, gs):
        super().__init__(gs); self.segs = []; self.p = None; self.s = None
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
    return pen.segs, f['head'].unitsPerEm

def cut_h(font, ch, y_units):
    """Ascisse (in unità em) dove la retta orizzontale y taglia il contorno."""
    segs, _ = _segs(font, ch); xs = []
    for (x0, y0), (x1, y1) in segs:
        if (y0 - y_units) * (y1 - y_units) < 0:
            xs.append(x0 + (y_units - y0) * (x1 - x0) / (y1 - y0))
    return sorted(xs)

def cut_v(font, ch, x_units):
    segs, _ = _segs(font, ch); ys = []
    for (x0, y0), (x1, y1) in segs:
        if (x0 - x_units) * (x1 - x_units) < 0:
            ys.append(y0 + (x_units - x0) * (y1 - y0) / (x1 - x0))
    return sorted(ys)

def gl(ch, size, x, y, font=SANS, sw=1.8, hatch='h1'):
    d, adv = glyph_path(font, ch, size, x, y)
    return (f'<path d="{d}" fill="url(#{hatch})" opacity="0.30"/>'
            f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'), adv

def guide(x1, x2, y):
    return ink(wobble_line(x1, y, x2, y, 0.3), 0.9, RED, dash='5 4')

def shape(d):
    return (f'<path d="{d}" fill="url(#h2)" opacity="0.32"/>' + ink(d, 1.8))

def tri_up(cx, top, base, half):
    return f'M {cx-half},{base} L {cx},{top} L {cx+half},{base} Z'
def tri_dn(cx, top, base, half):
    return f'M {cx-half},{top} L {cx+half},{top} L {cx},{base} Z'
def circ(cx, cy, r):
    return (f'M {cx-r},{cy} A {r},{r} 0 1,0 {cx+r},{cy} A {r},{r} 0 1,0 {cx-r},{cy} Z')
def sq(cx, top, base, half):
    return f'M {cx-half},{top} L {cx+half},{top} L {cx+half},{base} L {cx-half},{base} Z'

W, H = 940, 730
seeded(81)
b = []

# ═════════ I · IL SORMONTO ═════════
b.append(caps(250, 112, 'I · IL SORMONTO', size=12))
XS = [90, 197, 304, 411]; HALF = 40; EX = 2      # EX: correzioni raddoppiate
rows = [(150, 230, 0, 'geometricamente uguali', 'cerchio e triangoli sembrano più piccoli'),
        (290, 370, 1, 'otticamente uguali', 'le forme tonde e appuntite superano le linee')]
for top, base, corr, t1, t2 in rows:
    b.append(guide(44, 456, top)); b.append(guide(44, 456, base))
    hgt = base - top
    o_round = 0.03 * hgt * EX * corr          # ~3 % in alto e in basso
    o_point = 0.06 * hgt * EX * corr          # le punte sporgono di più
    b.append(shape(tri_up(XS[0], top - o_point, base, HALF)))
    b.append(shape(sq(XS[1], top, base, HALF)))
    b.append(shape(circ(XS[2], (top + base) / 2, hgt / 2 + o_round)))
    b.append(shape(tri_dn(XS[3], top, base + o_point, HALF)))
    b.append(label(250, base + 24, t1, 'middle', 12.5, RED if corr else INK2, style='italic'))
    b.append(label(250, base + 40, t2, 'middle', 11, INK2, style='italic'))

# Nel carattere vero
m = _font(SANS)['OS/2']; upm = _font(SANS)['head'].unitsPerEm
S = 118; k = S / upm; BASE = 560; CAP = BASE - m.sCapHeight * k
b.append(guide(44, 456, CAP)); b.append(guide(44, 456, BASE))
x = 78
for ch in 'AHOV':
    g, adv = gl(ch, S, x, BASE); b.append(g); x += adv + 6
b.append(label(250, BASE + 24, 'lo stesso, nelle lettere di un carattere vero', 'middle', 11, INK2, style='italic'))

b.append(ink(wobble_line(480, 100, 480, 640, 0.7), 1.0, INK2, dash='6 5'))

# ═════════ II · LA O NON È UNA H ═════════
b.append(caps(705, 112, 'II · LA O NON È UNA H', size=12))
S2 = 150; k2 = S2 / upm; B2 = 330; C2 = B2 - m.sCapHeight * k2
b.append(guide(514, 902, C2)); b.append(guide(514, 902, B2))
X0 = 540
gH, aH = gl('H', S2, X0, B2, sw=2.0)
gO, aO = gl('O', S2, X0 + aH, B2, sw=2.0)
gH2, _ = gl('H', S2, X0 + aH + aO, B2, sw=2.0)
b += [gH, gO, gH2]

# misure vere sul contorno
cap_u = m.sCapHeight
ob = glyph_bounds(SANS, 'O', upm)                  # in unità em
over_top = (ob[3] - cap_u) / cap_u * 100
over_bot = (-ob[1]) / cap_u * 100
EPS = 0.37   # evita di cadere esattamente su un vertice del contorno
xs_H = cut_h(SANS, 'H', cap_u * 0.25 + EPS)              # sotto la traversa
stem = xs_H[1] - xs_H[0]
xs_O = cut_h(SANS, 'O', (ob[1] + ob[3]) / 2 + EPS)       # a metà altezza
curve = xs_O[1] - xs_O[0]
ratio = curve / stem * 100

# quota dello spessore: asta della H e fianco della O
def bar(x1, x2, y):
    return (ink(wobble_line(x1, y, x2, y, 0.2), 1.6, RED) +
            ink(wobble_line(x1, y - 6, x1, y + 6, 0.2), 1.1, RED) +
            ink(wobble_line(x2, y - 6, x2, y + 6, 0.2), 1.1, RED))
yH = B2 - cap_u * 0.25 * k2
b.append(bar(X0 + xs_H[0] * k2, X0 + xs_H[1] * k2, yH))
yO = B2 - (ob[1] + ob[3]) / 2 * k2
b.append(bar(X0 + aH + xs_O[0] * k2, X0 + aH + xs_O[1] * k2, yO))
b.append(label(X0 + xs_H[0] * k2 + stem * k2 / 2, B2 + 22, 'asta 100', 'middle', 11, RED, style='italic'))
b.append(label(X0 + aH + xs_O[0] * k2 + curve * k2 / 2, B2 + 22, f'curva {ratio:.0f}', 'middle', 11, RED, style='italic'))

# richiamo del sormonto in alto
ox = X0 + aH + aO / 2
b.append(leader(ox + 70, C2 - 34, ox + 8, B2 - ob[3] * k2 + 1))
b.append(label(ox + 74, C2 - 36, f'sormonto +{over_top:.1f} %', 'start', 11, RED, style='italic'))

for i, t in enumerate(['Una curva tocca la linea in un punto solo, un\'asta per tutta la',
                       'sua larghezza: se fossero uguali, la O sembrerebbe più piccola',
                       'e più chiara. Per questo è più alta e più spessa.']):
    b.append(label(708, B2 + 56 + i * 17, t, 'middle', 11, INK2, style='italic'))

# ═════════ III · LA METÀ SUPERIORE ═════════
b.append(caps(705, 450, 'III · LA METÀ SUPERIORE', size=12))
S3 = 108; k3 = S3 / upm; B3 = 570; C3 = B3 - cap_u * k3; MID = (B3 + C3) / 2
b.append(guide(514, 902, C3)); b.append(guide(514, 902, B3))
b.append(ink(wobble_line(514, MID, 902, MID, 0.3), 0.9, INK2, dash='2 4'))
b.append(label(516, MID - 5, 'metà', 'start', 10, INK2, style='italic'))
x = 575; counters = []
for ch in 'BES8':
    g, adv = gl(ch, S3, x, B3); b.append(g)
    bb = glyph_bounds(SANS, ch, upm)
    cx_u = bb[0] + (bb[2] - bb[0]) * 0.5
    ys = cut_v(SANS, ch, cx_u + EPS)          # 6 tagli: fondo, occhio basso, vita, occhio alto, cima
    lo, hi = ys[2] - ys[1], ys[4] - ys[3]
    counters.append((ch, round(hi / lo * 100)))
    cxp = x + cx_u * k3
    for y1, y2 in ((ys[1], ys[2]), (ys[3], ys[4])):
        b.append(ink(wobble_line(cxp, B3 - y1 * k3, cxp, B3 - y2 * k3, 0.2), 1.4, RED))
        for yy in (y1, y2):
            b.append(ink(wobble_line(cxp - 5, B3 - yy * k3, cxp + 5, B3 - yy * k3, 0.1), 1.0, RED))
    b.append(label(x + adv / 2, B3 + 20, f'{round(hi / lo * 100)} : 100', 'middle', 10.5, RED, style='italic'))
    x += adv + 22
b.append(label(708, B3 + 42, 'l\'occhio superiore è più basso di quello inferiore: se fossero', 'middle', 11, INK2, style='italic'))
b.append(label(708, B3 + 58, 'uguali, la lettera sembrerebbe capovolta, con la testa troppo grossa', 'middle', 11, INK2, style='italic'))

# ── chiusa ──
b.append(ink(wobble_line(60, 662, 880, 662, 0.6), 1.0, INK2))
b.append(label(470, 686, 'Nella parte I le correzioni sono raddoppiate per renderle visibili; nelle parti II e III sono quelle vere,', 'middle', 11, INK2, style='italic'))
b.append(label(470, 704, 'misurate sul contorno dell\'Archivo Bold. Un carattere disegnato col righello sembra sbagliato proprio perché è esatto.', 'middle', 11, INK2, style='italic'))

open(APP + '/plates/ottica.svg', 'w').write(
    plate(W, H, ''.join(b), title='CORREZIONI OTTICHE',
          subtitle='Perché una lettera, per sembrare giusta, deve essere sbagliata', figno='Tav. VIII'))
print(f'sormonto O: sopra {over_top:.2f}%  sotto {over_bot:.2f}%')
print(f'asta H {stem:.0f}u  curva O {curve:.0f}u  rapporto {ratio:.1f}')
print('occhio alto : basso', counters)
