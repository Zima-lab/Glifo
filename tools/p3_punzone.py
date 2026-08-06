import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # la cartella dell'app
from lib import *
from glyphs import glyph_path
FD = APP + '/fonts/specimen/'
SER=FD+'eb-garamond-400-latin.woff2'
W,H=940,600; seeded(31); b=[]

def gl(ch,size,x,y,sw=1.6,fill='none',mirror=False):
    d,adv=glyph_path(SER,ch,size,0,0)
    tr=f'translate({x},{y})'+(' scale(-1,1)' if mirror else '')
    return f'<g transform="{tr}"><path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}"/></g>',adv

def prism(x,y,w,h,d=16,label_txt='',face=None):
    """Un parallelepipedo in assonometria, come nelle tavole tecniche."""
    o=[]
    o.append(ink(wobble_rect(x,y,w,h,0.7),1.8))
    o.append(f'<path d="{poly3([(x,y),(x+d,y-d),(x+w+d,y-d),(x+w,y)])}" fill="url(#h1)" opacity="0.35"/>')
    o.append(ink(poly3([(x,y),(x+d,y-d),(x+w+d,y-d),(x+w,y)]),1.4))
    o.append(f'<path d="{poly3([(x+w,y),(x+w+d,y-d),(x+w+d,y+h-d),(x+w,y+h)])}" fill="url(#hx)" opacity="0.30"/>')
    o.append(ink(poly3([(x+w,y),(x+w+d,y-d),(x+w+d,y+h-d),(x+w,y+h)]),1.4))
    return ''.join(o)

def poly3(pts):
    return 'M '+' L '.join(f'{p[0]:.0f},{p[1]:.0f}' for p in pts)+' Z'

STEPS=[
 (110,'1. PUNZONE','acciaio','la lettera incisa a mano,\nin rilievo e a rovescio'),
 (350,'2. MATRICE','rame','il punzone battuto nel rame:\nlettera incavata e diritta'),
 (590,'3. CARATTERE','lega','piombo colato nella forma:\nlettera in rilievo e diritta'),
 (820,'4. STAMPA','carta','inchiostrato e impresso:\nlettera diritta sul foglio'),
]
for cx,ttl,mat,desc in STEPS:
    b.append(prism(cx-46,200,92,150))
    b.append(caps(cx,178,ttl,size=11.5))
    b.append(label(cx,404,mat,'middle',11,RED,style='italic'))
    for i,ln in enumerate(desc.split('\n')):
        b.append(label(cx,426+i*15,ln,'middle',10.5,INK2,style='italic'))

# le lettere sulle facce: rovescia, rovescia-incavata, rovescia, diritta
g,_=gl('a',86,110+28,300,1.7,mirror=True); b.append(g)
g,_=gl('a',86,350+28,300,1.7,mirror=True); b.append(g)
b.append(label(350,318,'(incavo)','middle',9.5,INK2,style='italic'))
g,_=gl('a',86,590+28,300,1.7,mirror=True); b.append(g)
g,_=gl('a',86,820-28,300,1.9); b.append(g)

# frecce fra una fase e l'altra
for x1,x2 in ((166,296),(406,536),(646,766)):
    b.append(ink(wobble_line(x1,275,x2-14,275,0.6),1.4))
    b.append(ink(f'M {x2-14},275 L {x2-26},269 M {x2-14},275 L {x2-26},281',1.4))

b.append(label(470,494,'Ogni corpo richiedeva un punzone diverso, inciso da capo: nel piombo l\'ingrandimento non esisteva.','middle',11.5,INK2,style='italic'))
b.append(label(470,514,'La lettera è a rovescio in tre fasi su quattro — torna diritta solo sulla carta.','middle',11.5,INK2,style='italic'))

open(APP + '/plates/punzone.svg','w').write(
 plate(W,H,''.join(b),title='DAL PUNZONE ALLA CARTA',
   subtitle='La catena di fabbricazione del carattere mobile',figno='Tav. III'))
