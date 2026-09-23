import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from lib import *
from glyphs import glyph_path, glyph_bounds

FD = APP + '/fonts/specimen/'
GOT=FD+'unifrakturcook-700-latin.woff2'; SER=FD+'eb-garamond-400-latin.woff2'
W,H=940,680; seeded(23); b=[]

def gl(ch,size,x,y,font,sw=2.0,hatch=None):
    d,adv=glyph_path(font,ch,size,x,y); out=''
    if hatch: out+=f'<path d="{d}" fill="url(#{hatch})" opacity="0.25"/>'
    out+=f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return out,adv

b.append(caps(268,126,'ANTIQUA — ARCO CONTINUO',size=12))
b.append(caps(672,126,'GOTICA — ARCO SPEZZATO',size=12))
b.append(ink(wobble_line(470,104,470,382,0.7),1.0,INK2,dash='6 5'))

S=180; BY=300
# antiqua
x=190
for ch in 'om':
    g,a=gl(ch,S,x,BY,SER,2.0,hatch='h1'); b.append(g); x+=a+10
# gotica — e i punti di rottura, calcolati dalla bbox reale del glifo
gx=590
g,ao=gl('o',S,gx,BY,GOT,2.0,hatch='h1'); b.append(g)
ox0,ox1 = gx+0.014*S, gx+0.403*S
oy0,oy1 = BY-0.529*S, BY-0.007*S
marks=[(ox0+2,(oy0+oy1)/2),(ox1-2,(oy0+oy1)/2),((ox0+ox1)/2,oy0+3),((ox0+ox1)/2,oy1-3)]
mx=gx+ao+10
g,am=gl('m',S,mx,BY,GOT,2.0,hatch='h1'); b.append(g)
my0=BY-0.527*S
for k in (0.18,0.50,0.82):
    marks.append((mx+0.022*S+(0.64-0.022)*S*k, my0+4))
for px,py in marks:
    b.append(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="7" fill="none" stroke="{RED}" stroke-width="1.5"/>')

b.append(label(268,358,'nessuna rottura: la curva gira intera','middle',13,INK2,style='italic'))
b.append(label(672,358,'Bogenbrechung: la curva si spezza in angoli','middle',13,RED,style='italic'))

# ═══ Le quattro varietà: la « o » vera, presa da un carattere di ciascuna ═══
# Nessuno schema disegnato a mano: sono contorni estratti dai font, come in alto.
# I quattro font stanno in tools/fonts/ e servono solo qui, alla generazione:
# la tavola è già vettorializzata, quindi l'app non li carica.
TF = os.path.dirname(os.path.abspath(__file__)) + '/fonts/'

b.append(ink(wobble_line(60,406,880,406,0.6),1.1))
b.append(caps(470,438,'LE QUATTRO VARIETÀ, NELLA FORMA DELLA « O »',size=11,color=INK2))

def o_reale(cx, by, fontpath, h=74, sw=2.0):
    """La « o » del font, riscalata perché tutte e quattro abbiano la stessa
    altezza ottica, e centrata sulla colonna sul suo riquadro reale."""
    x0, y0, x1, y1 = glyph_bounds(fontpath, 'o', 100)
    size = 100 * h / (y1 - y0)                       # altezza dell'occhio = h
    x0, y0, x1, y1 = glyph_bounds(fontpath, 'o', size)
    d, _ = glyph_path(fontpath, 'o', size, cx - (x0 + x1) / 2, by + y0)
    return (f'<path d="{d}" fill="url(#h1)" opacity="0.25"/>' +
            f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>')

fam=[(TF+'Missaali-Regular.otf',    'Textura',    'sec. XII',
      'quattro spigoli vivi:',      'non resta un solo tratto curvo'),
     (TF+'GotischeMissalschrift.ttf','Rotunda',   'sec. XIV',
      'italiana: la curva ritorna,', 'gli spigoli restano accennati'),
     (TF+'EhmckeSchwabacher.ttf',   'Schwabacher','1470 ca.',
      'a mandorla e obliqua:',      'una punta in alto, una in basso'),
     (TF+'UnifrakturMaguntia.woff2','Fraktur',    '1520 ca.',
      'sinistra spezzata in due,',  'destra ancora curva')]
for i,(fp,nm,yr,d1,d2) in enumerate(fam):
    cx=140+i*220
    b.append(o_reale(cx,552,fp,h=84))
    b.append(label(cx,582,nm,'middle',15.5,INK))
    b.append(label(cx,599,yr,'middle',11,RED,style='italic'))
    b.append(label(cx,616,d1,'middle',10,INK2,style='italic'))
    b.append(label(cx,629,d2,'middle',10,INK2,style='italic'))

# I quattro campioni non sono i tipi storici, ma revival moderni: va detto,
# perché un campione spacciato per l'originale insegnerebbe dettagli sbagliati.
b.append(label(60,654,'campioni da revival moderni, licenza SIL OFL: Missaali · Gotische '
                      'Missalschrift · Ehmcke Schwabacher · UnifrakturMaguntia',
               'start',8.5,INK2,style='italic'))

open(APP + '/plates/gotiche.svg','w').write(
  plate(W,H,''.join(b),title='LE SCRITTURE GOTICHE',
        subtitle='La rottura dell\'arco e le quattro varietà storiche',figno='Tav. II'))
