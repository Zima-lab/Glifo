"""Generatore di tavole in stile enciclopedia ottocentesca.

Il tratto a mano si ottiene in due modi:
  1. jitter — ogni linea è spezzata in segmenti con un piccolo scarto casuale,
     come una penna che non tiene la riga perfetta;
  2. doppio passaggio — le linee importanti sono tracciate due volte con
     scarti diversi, come il ripasso a inchiostro sopra la matita.
Il tratteggio (hatching) imita il bulino: linee parallele fitte al posto
delle campiture piene, perché l'incisione non conosce il grigio.
"""
import random, math

INK   = '#3A3226'   # inchiostro ferro-gallico, bruno più che nero
INK2  = '#6B5D49'   # tratto secondario, più chiaro
RED   = '#9B3A2A'   # rosso minio delle annotazioni
PAPER = '#F2E8D5'   # carta invecchiata
PAPER2= '#E8DBC0'   # ombra della carta

def seeded(n):
    random.seed(n)

def jit(x, y, a=1.0):
    return x + random.uniform(-a, a), y + random.uniform(-a, a)

def wobble_line(x1, y1, x2, y2, amp=0.9, seg=14):
    """Una retta tracciata a mano: spezzata in segmenti con scarto casuale."""
    n = max(2, int(math.hypot(x2-x1, y2-y1) / seg))
    pts = []
    for i in range(n + 1):
        t = i / n
        x = x1 + (x2 - x1) * t
        y = y1 + (y2 - y1) * t
        # gli estremi restano fermi, il tremolio cresce verso il centro
        k = math.sin(math.pi * t) * amp
        pts.append(jit(x, y, k))
    return 'M ' + ' L '.join(f'{p[0]:.1f},{p[1]:.1f}' for p in pts)

def wobble_rect(x, y, w, h, amp=0.9):
    return (wobble_line(x, y, x+w, y, amp) + ' ' +
            wobble_line(x+w, y, x+w, y+h, amp) + ' ' +
            wobble_line(x+w, y+h, x, y+h, amp) + ' ' +
            wobble_line(x, y+h, x, y, amp))

def wobble_circle(cx, cy, r, amp=1.0, n=44):
    pts = []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        rr = r + random.uniform(-amp, amp)
        pts.append((cx + rr*math.cos(a), cy + rr*math.sin(a)))
    return 'M ' + ' L '.join(f'{p[0]:.1f},{p[1]:.1f}' for p in pts) + ' Z'

def ink(d, w=1.6, color=INK, dash=None, cap='round'):
    da = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" '
            f'stroke-linecap="{cap}" stroke-linejoin="round"{da}/>')

def ink2x(d1, d2, w=1.5, color=INK):
    """Ripasso: due tracciati leggermente diversi sovrapposti."""
    return ink(d1, w, color) + ink(d2, w*0.7, color)

def hatch_defs():
    """Tre densità di tratteggio, come le tre profondità del bulino."""
    out = ['<defs>']
    for name, gap, wdt, ang in (('h1', 6, 0.8, 45), ('h2', 3.6, 0.9, 45), ('h3', 2.4, 1.1, 45)):
        out.append(
            f'<pattern id="{name}" width="{gap}" height="{gap}" '
            f'patternUnits="userSpaceOnUse" patternTransform="rotate({ang})">'
            f'<line x1="0" y1="0" x2="0" y2="{gap}" stroke="{INK}" stroke-width="{wdt}"/>'
            f'</pattern>')
    # tratteggio incrociato per le ombre più profonde
    out.append(
        f'<pattern id="hx" width="3.4" height="3.4" patternUnits="userSpaceOnUse" '
        f'patternTransform="rotate(45)">'
        f'<line x1="0" y1="0" x2="0" y2="3.4" stroke="{INK}" stroke-width="0.9"/>'
        f'<line x1="0" y1="0" x2="3.4" y2="0" stroke="{INK}" stroke-width="0.9"/>'
        f'</pattern>')
    # grana della carta
    # Le impurità della carta: puntini sparsi, non un filtro di rumore.
    # feTurbulence viene reso in modo troppo scuro da alcuni motori.
    out.append('</defs>')
    return ''.join(out)

def label(x, y, text, anchor='start', size=15, color=INK, style='normal', weight='400', spacing='0'):
    return (f'<text x="{x}" y="{y}" font-family="Georgia,\'Times New Roman\',serif" '
            f'font-size="{size}" fill="{color}" text-anchor="{anchor}" '
            f'font-style="{style}" font-weight="{weight}" letter-spacing="{spacing}">{text}</text>')

def caps(x, y, text, anchor='middle', size=13, color=INK):
    return label(x, y, text, anchor, size, color, spacing='2.5')

def leader(x1, y1, x2, y2, color=RED):
    """Linea di richiamo con pallino, come nelle tavole anatomiche."""
    return (ink(wobble_line(x1, y1, x2, y2, 0.5), 0.9, color) +
            f'<circle cx="{x2:.1f}" cy="{y2:.1f}" r="2.2" fill="{color}"/>')

def foxing(w, h, n=190):
    """Le macchioline brune della carta invecchiata, sparse a caso."""
    random.seed(99)
    out = []
    for _ in range(n):
        x, y = random.uniform(0, w), random.uniform(0, h)
        r = random.uniform(0.4, 1.9)
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="{INK}" opacity="{random.uniform(0.03,0.09):.2f}"/>')
    return ''.join(out)

def plate(w, h, body, title=None, subtitle=None, figno=None):
    """Cornice della tavola: doppio filetto, carta, titolo in capitale spaziata."""
    seeded(7)
    frame = (ink(wobble_rect(10, 10, w-20, h-20, 1.2), 1.9) +
             ink(wobble_rect(16, 16, w-32, h-32, 0.8), 0.7, INK2))
    head = ''
    if title:
        head += caps(w/2, 46, title, size=15)
        head += ink(wobble_line(w/2-110, 56, w/2+110, 56, 0.6), 1.0)
    if subtitle:
        head += label(w/2, 74, subtitle, 'middle', 12.5, INK2, style='italic')
    if figno:
        head += label(w-30, h-26, figno, 'end', 11.5, INK2, style='italic')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" role="img">'
            f'{hatch_defs()}'
            f'<rect width="{w}" height="{h}" fill="{PAPER}"/>'
            f'{foxing(w, h)}'
            f'{frame}{head}{body}</svg>')
