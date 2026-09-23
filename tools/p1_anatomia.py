import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # la cartella dell'app
from lib import *
from glyphs import glyph_path, metrics

FD = APP + '/fonts/specimen/'
SERIF = FD + 'eb-garamond-400-latin.woff2'
W, H = 940, 640
seeded(11)
b = []

def letter(ch, size, x, y, align='left', sw=2.0, hatch=None, font=SERIF):
    d, adv = glyph_path(font, ch, size, x, y, align)
    out = ''
    if hatch: out += f'<path d="{d}" fill="url(#{hatch})" opacity="0.26"/>'
    out += f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return out, adv

def note(tx, ty, txt, px, py, side):
    est = len(txt) * 7.4
    anchor, x0 = ('start', tx + est + 8) if side == 'left' else ('end', tx - est - 8)
    return label(tx, ty, txt, anchor, 15, RED, style='italic') + leader(x0, ty - 5, px, py)

# ═══ FIG. 1 — la "g" ═══
# Le ancore dei richiami sono calcolate dalla bbox reale del glifo,
# non a occhio: così restano corrette anche cambiando corpo o carattere.
GS, GCX, GBY = 250, 292, 400
gx0, gx1 = GCX - 0.435*GS/2 + 0.011*GS, GCX - 0.435*GS/2 + 0.441*GS
gy_top, gy_bot = GBY - 0.416*GS, GBY + 0.290*GS
g, _ = letter('g', GS, GCX, GBY, 'middle', hatch='h1')
b.append(g)

A = lambda fx, fy: (gx0 + (gx1-gx0)*fx, gy_top + (gy_bot-gy_top)*fy)
b.append(note(44,  248, 'Occhiello',    *A(0.14, 0.14), 'left'))
b.append(note(44,  300, 'Contrografia', *A(0.44, 0.20), 'left'))
b.append(note(44,  452, 'Ansa',         *A(0.20, 0.80), 'left'))
b.append(note(430, 214, 'Orecchio',     *A(0.94, 0.05), 'right'))
b.append(note(430, 320, 'Gola',         *A(0.80, 0.47), 'right'))
b.append(note(430, 462, 'Coda',         *A(0.62, 0.94), 'right'))

# ═══ FIG. 2 — le quote verticali ═══
# Il corpo è calcolato perché "Hxp" stia esattamente nella colonna disponibile.
COL_X, COL_W = 566, 236
BS = COL_W / 2.274   # somma degli avanzamenti di Hbxp
BY = 430
m = metrics(SERIF, BS)
Y = {'asc': BY - 0.705*BS, 'cap': BY - m['cap'], 'x': BY - m['x'],
     'base': BY, 'desc': BY + 0.290*BS}

x = COL_X
for ch in 'Hbxp':
    gl, adv = letter(ch, BS, x, BY, sw=1.8, hatch='h1')
    b.append(gl); x += adv

# In questo carattere l'ascendente e l'altezza maiuscole distano pochi
# millesimi: le due etichette si sovrapporrebbero. Le alterno sui due lati,
# come si fa nelle tavole quotate.
for k, txt, side in [('asc','ascendenti','L'), ('cap','maiuscole','R'), ('x','altezza-x','L'),
                     ('base','linea di base','L'), ('desc','discendenti','L')]:
    y = Y[k]
    b.append(ink(wobble_line(COL_X - 22, y, COL_X + COL_W + 22, y, 0.5), 0.9, INK2, dash='8 5'))
    if side == 'L':
        b.append(label(COL_X - 30, y + 4, txt, 'end', 11.5, INK2, style='italic'))
    else:
        b.append(label(COL_X + COL_W + 30, y + 4, txt, 'start', 11.5, INK2, style='italic'))

b.append(caps(292, 566, 'FIG. 1 — LE PARTI DEL SEGNO', size=11, color=INK2))
b.append(caps(700, 566, 'FIG. 2 — LE QUOTE VERTICALI', size=11, color=INK2))

open(APP + '/plates/anatomia.svg','w').write(
    plate(W, H, ''.join(b), title='ANATOMIA DELLA LETTERA',
          subtitle='Le parti del segno e le linee su cui è costruito', figno='Tav. I'))
