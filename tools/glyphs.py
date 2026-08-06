"""Estrae il contorno vettoriale di un glifo da un font e lo restituisce
come path SVG. Le lettere della tavola sono così lettere vere, non schizzi:
è il disegno a contorno delle tavole ottocentesche, dove il segno tipografico
va riprodotto fedelmente e la mano compare solo nelle annotazioni."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

_cache = {}

def _font(path):
    if path not in _cache:
        _cache[path] = TTFont(path)
    return _cache[path]

def glyph_path(fontpath, ch, size=100, x=0, y=0, align='left'):
    """Contorno di un carattere, scalato all'altezza em richiesta.
    y è la linea di base."""
    f = _font(fontpath)
    upm = f['head'].unitsPerEm
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    name = cmap.get(ord(ch))
    if name is None:
        raise ValueError('glifo assente: ' + ch)
    k = size / upm

    bp = BoundsPen(gs)
    gs[name].draw(bp)
    adv = gs[name].width * k
    dx = x
    if align == 'middle': dx = x - adv / 2
    elif align == 'right': dx = x - adv

    pen = SVGPathPen(gs)
    tp = TransformPen(pen, (k, 0, 0, -k, dx, y))
    gs[name].draw(tp)
    return pen.getCommands(), adv

def metrics(fontpath, size=100):
    """Le quote verticali del font, per tracciare le linee di costruzione."""
    f = _font(fontpath)
    upm = f['head'].unitsPerEm
    k = size / upm
    os2 = f['OS/2']
    return {
        'x': os2.sxHeight * k,
        'cap': os2.sCapHeight * k,
        'asc': f['hhea'].ascent * k,
        'desc': f['hhea'].descent * k,
    }
