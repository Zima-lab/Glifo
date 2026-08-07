"""Tav. VII — la mappa anatomica completa.

La Tav. I isola la « g » per spiegare sei parti con calma. Questa fa il
contrario: mette in fila dodici lettere e le annota tutte, come la tavola
d'insieme che nelle enciclopedie ottocentesche precedeva i dettagli.

Ogni richiamo porta il termine italiano e, sotto, quello inglese in corsivo:
è la convenzione dei manuali di tipografia, dove la nomenclatura corrente è
bilingue e il termine inglese serve a orientarsi nella documentazione dei
font.

Due accorgimenti tengono la tavola leggibile:

  1. le ancore non sono a occhio — si calcolano in frazioni del riquadro
     reale del glifo, così restano corrette se cambia il corpo o il font;
  2. le etichette si distribuiscono su due file alternate, ordinate per
     ascissa dell'ancora: le linee di richiamo della fila esterna passano
     negli spazi lasciati liberi da quella interna e non si incrociano mai.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from lib import *
from glyphs import glyph_path, glyph_bounds

FD = APP + '/fonts/specimen/'
SERIF = FD + 'eb-garamond-400-latin.woff2'
W, H = 940, 1030
seeded(23)
b = []


def guides(row, ys, margin=30):
    """Le linee di costruzione, tratteggiate e sottili, dietro ai glifi.

    Restano senza etichetta: le quote hanno già la loro tavola, qui servono
    solo a rendere visibile ciò che i richiami nominano — l'altezza-x, la
    linea di base e, soprattutto, il sormonto, che senza una linea da
    superare non si vedrebbe affatto."""
    return ''.join(
        ink(wobble_line(row.left - margin, y, row.right + margin, y, 0.5),
            0.8, INK2, dash='7 6')
        for y in ys)


def letter(ch, size, x, y, sw=1.9, hatch='h1'):
    """Contorno di una lettera, tratteggiato dentro come nelle incisioni."""
    d, adv = glyph_path(SERIF, ch, size, x, y)
    out = ''
    if hatch:
        out += f'<path d="{d}" fill="url(#{hatch})" opacity="0.20"/>'
    out += f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return out, adv


class Row:
    """Una riga di glifi centrata nella tavola.

    Ogni lettera conosce il proprio riquadro reale: un richiamo si chiede
    come « il 90% della larghezza, il 12% dell'altezza della Q » e resta al
    suo posto anche se la lettera cambia."""

    def __init__(self, chars, size, baseline, gap):
        width = sum(glyph_path(SERIF, c, size, 0, 0)[1] for c in chars) + gap * (len(chars) - 1)
        cur = (W - width) / 2
        self.left, self.right = cur, cur + width
        self.box = {}
        for ch in chars:
            g, adv = letter(ch, size, cur, baseline)
            b.append(g)
            x0, y0, x1, y1 = glyph_bounds(SERIF, ch, size)
            # glyph_bounds è in coordinate del font: y cresce verso l'alto
            self.box[ch] = (cur + x0, baseline - y1, cur + x1, baseline - y0)
            cur += adv + gap

    def at(self, ch, fx, fy):
        x0, y0, x1, y1 = self.box[ch]
        return x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy


def band(row, notes, y_near, y_far, margin=38):
    """Dispone un gruppo di richiami sopra o sotto la riga di glifi.

    « vicino » è la fila accostata ai glifi, « lontano » quella esterna.
    I richiami si ordinano per ascissa del punto annotato e si alternano fra
    le due file: così ogni linea scende dritta nel suo corridoio.

    A parità di ascissa — due richiami sulla stessa lettera, come il rostro e
    lo sperone della « G » — vince l'ancora più lontana dalle etichette: se
    prendesse il posto esterno, la sua linea taglierebbe quella dell'altra."""
    above = y_far < y_near
    x0, x1 = row.left - margin, row.right + margin
    items = sorted(((row.at(ch, fx, fy), it, en) for ch, fx, fy, it, en in notes),
                   key=lambda t: (t[0][0], -t[0][1] if above else t[0][1]))
    n = len(items)
    step = (x1 - x0) / (n - 1) if n > 1 else 0
    out = []
    for i, ((px, py), it, en) in enumerate(items):
        lx = x0 + step * i
        ly = y_near if i % 2 else y_far
        out.append(label(lx, ly, it, 'middle', 13.5, INK))
        out.append(label(lx, ly + 13, en, 'middle', 11, INK2, style='italic'))
        # il richiamo parte dal bordo del blocco di testo rivolto ai glifi
        sy = ly + 25 if py > ly else ly - 19
        out.append(leader(lx, sy, px, py))
    return ''.join(out)


# ═══════════════════════════════════════════════════════════════════
# FIG. 1 — A È Q f g : maiuscole, accenti e ascendenti
# ═══════════════════════════════════════════════════════════════════
S1, BL1 = 150, 352
r1 = Row('AÈQfg', S1, BL1, gap=30)
# altezza delle accentate, altezza maiuscole, linea di base
b.insert(0, guides(r1, [r1.box['È'][1], r1.box['A'][1], BL1]))

b.append(band(r1, [
    ('A', 0.46, 0.01, 'Vertice',            'apex'),
    ('A', 0.19, 0.70, 'Asta obliqua',       'diagonal stroke'),
    ('È', 0.40, 0.01, 'Altezza accentate',  'accent height'),
    ('È', 0.78, 0.24, 'Braccio',            'arm'),
    ('Q', 0.50, 0.44, 'Contrografia chiusa', 'closed counter'),
    ('f', 0.80, 0.03, 'Uncino',             'hook'),
    ('g', 0.94, 0.04, 'Orecchio',           'ear'),
], y_near=178, y_far=118))

b.append(band(r1, [
    ('A', 0.10, 0.99, 'Grazia',         'serif'),
    ('È', 0.17, 0.62, 'Tratto pieno',   'downstroke'),
    ('Q', 0.60, 0.97, 'Coda',           'tail'),
    ('f', 0.40, 0.66, 'Asta verticale', 'stem'),
    ('f', 0.16, 0.99, 'Raccordo',       'bracket'),
    ('g', 0.74, 0.50, 'Collo',          'link'),
    ('g', 0.30, 0.88, 'Ansa',           'loop'),
], y_near=452, y_far=512))

b.append(caps(W / 2, 566, 'FIG. 1 — MAIUSCOLE, ACCENTI E ASCENDENTI', size=11, color=INK2))

# ═══════════════════════════════════════════════════════════════════
# FIG. 2 — x b n k o q G : minuscole, discendenti e la « G »
# ═══════════════════════════════════════════════════════════════════
S2, BL2 = 128, 784
r2 = Row('xbnkoqG', S2, BL2, gap=22)
# ascendenti, linea mediana, linea di base, discendenti
b.insert(0, guides(r2, [r2.box['b'][1], r2.box['x'][1], BL2, r2.box['q'][3]]))

b.append(band(r2, [
    ('x', 0.50, 0.02, 'Altezza-x',         'x-height'),
    ('b', 0.22, 0.02, 'Ascendente',        'ascender'),
    ('n', 0.62, 0.03, 'Arco',              'arch'),
    ('k', 0.66, 0.62, 'Intaglio',          'notch'),
    ('o', 0.86, 0.30, 'Asse di contrasto', 'stress axis'),
    ('G', 0.86, 0.06, 'Rostro',            'beak'),
    ('G', 0.92, 0.62, 'Sperone',           'spur'),
], y_near=666, y_far=606))

b.append(band(r2, [
    ('x', 0.24, 0.80, 'Tratto sottile', 'hairline'),
    ('b', 0.62, 0.74, 'Pancia',         'bowl'),
    ('k', 0.84, 0.99, 'Gamba',          'leg'),
    ('o', 0.50, 1.00, 'Sormonto',       'overshoot'),
    ('q', 0.80, 0.97, 'Discendente',    'descender'),
    ('G', 0.78, 0.80, 'Gola',           'throat'),
], y_near=878, y_far=942))

b.append(caps(W / 2, 1000, 'FIG. 2 — MINUSCOLE, DISCENDENTI E LA « G »', size=11, color=INK2))

open(APP + '/plates/anatomia2.svg', 'w').write(
    plate(W, H, ''.join(b), title='LE PARTI DELLA LETTERA',
          subtitle='Nomenclatura italiana e inglese sopra un carattere garaldo',
          figno='Tav. VII'))
print('scritta plates/anatomia2.svg')
