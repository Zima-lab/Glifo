import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from lib import *
from glyphs import glyph_path

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

# ═══ Le quattro varietà: schemi disegnati a mano della sola "o" ═══
b.append(ink(wobble_line(60,406,880,406,0.6),1.1))
b.append(caps(470,438,'LE QUATTRO VARIETÀ, NELLA FORMA DELLA « O »',size=11,color=INK2))

def poly(pts, close=True):
    d='M '+' L '.join(f'{p[0]:.1f},{p[1]:.1f}' for p in pts)
    return d+(' Z' if close else '')

def shape(cx,cy,kind,r=54):
    """Le quattro "o" gotiche, ridotte al loro schema geometrico."""
    if kind=='textura':      # rombo netto: quattro spigoli vivi
        outer=[(cx,cy-r),(cx+r*0.62,cy),(cx,cy+r),(cx-r*0.62,cy)]
        inner=[(cx,cy-r*0.42),(cx+r*0.26,cy),(cx,cy+r*0.42),(cx-r*0.26,cy)]
    elif kind=='rotunda':    # quasi tonda: spigoli appena accennati
        outer=[(cx,cy-r),(cx+r*0.66,cy-r*0.72),(cx+r*0.86,cy),(cx+r*0.66,cy+r*0.72),
               (cx,cy+r),(cx-r*0.66,cy+r*0.72),(cx-r*0.86,cy),(cx-r*0.66,cy-r*0.72)]
        inner=[(p[0]*0.999,p[1]) for p in
               [(cx,cy-r*0.5),(cx+r*0.3,cy-r*0.3),(cx+r*0.38,cy),(cx+r*0.3,cy+r*0.3),
                (cx,cy+r*0.5),(cx-r*0.3,cy+r*0.3),(cx-r*0.38,cy),(cx-r*0.3,cy-r*0.3)]]
    elif kind=='schwabacher':  # a mandorla: due punte, sinistra tonda
        outer=[(cx,cy-r*1.06),(cx+r*0.72,cy-r*0.34),(cx+r*0.58,cy+r*0.5),(cx,cy+r*1.06),
               (cx-r*0.74,cy+r*0.46),(cx-r*0.9,cy-r*0.1),(cx-r*0.5,cy-r*0.78)]
        inner=[(cx,cy-r*0.46),(cx+r*0.3,cy-r*0.08),(cx+r*0.22,cy+r*0.26),(cx,cy+r*0.46),
               (cx-r*0.28,cy+r*0.18),(cx-r*0.3,cy-r*0.14)]
    else:                     # fraktur: sinistra spezzata, destra curva
        outer=[(cx,cy-r),(cx+r*0.6,cy-r*0.5),(cx+r*0.68,cy+r*0.3),(cx,cy+r),
               (cx-r*0.5,cy+r*0.5),(cx-r*0.66,cy),(cx-r*0.44,cy-r*0.6)]
        inner=[(cx,cy-r*0.44),(cx+r*0.28,cy-r*0.2),(cx+r*0.32,cy+r*0.14),(cx,cy+r*0.44),
               (cx-r*0.24,cy+r*0.22),(cx-r*0.3,cy),(cx-r*0.2,cy-r*0.26)]
    out=f'<path d="{poly(outer)}" fill="url(#h1)" opacity="0.3"/>'
    out+=ink(poly(outer),2.2)+ink(poly(inner),1.5,INK2)
    return out

fam=[('textura','Textura','sec. XII','rombo netto, quattro spigoli vivi'),
     ('rotunda','Rotunda','sec. XIV','italiana, spigoli appena accennati'),
     ('schwabacher','Schwabacher','1470 ca.','a mandorla, sinistra ancora tonda'),
     ('fraktur','Fraktur','1520 ca.','sinistra spezzata, destra curva')]
for i,(k,nm,yr,desc) in enumerate(fam):
    cx=140+i*220
    b.append(shape(cx,520,k))
    b.append(label(cx,592,nm,'middle',15.5,INK))
    b.append(label(cx,610,yr,'middle',11,RED,style='italic'))
    b.append(label(cx,630,desc,'middle',10,INK2,style='italic'))

open(APP + '/plates/gotiche.svg','w').write(
  plate(W,H,''.join(b),title='LE SCRITTURE GOTICHE',
        subtitle='La rottura dell\'arco e le quattro varietà storiche',figno='Tav. II'))
