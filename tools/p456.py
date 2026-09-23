import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from lib import *
from glyphs import glyph_path
FD = APP + '/fonts/specimen/'
F={'uman':FD+'eb-garamond-400-latin.woff2','gara':FD+'cormorant-garamond-500-latin.woff2',
   'tran':FD+'pt-serif-400-latin.woff2','dido':FD+'playfair-display-600-latin.woff2',
   'slab':FD+'roboto-slab-500-latin.woff2','sans':FD+'archivo-500-latin.woff2'}

def gl(ch,size,x,y,font,sw=1.8,align='left',hatch=None,fill='none'):
    d,adv=glyph_path(font,ch,size,x,y,align); out=''
    if hatch: out+=f'<path d="{d}" fill="url(#{hatch})" opacity="0.26"/>'
    out+=f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return out,adv

# ══════════ TAV. IV — ASSE DI CONTRASTO ══════════
W,H=940,560; seeded(41); b=[]
b.append(label(470,116,'La linea che unisce i due punti più sottili della « o » colloca un carattere nel suo secolo.','middle',12.5,INK2,style='italic'))
cols=[('uman','Umanista','sec. XV',-22),('gara','Garalda','sec. XVI',-16),
      ('tran','Transizionale','sec. XVIII',-6),('dido','Didone','sec. XIX',0),
      ('sans','Lineare','sec. XX',0)]
for i,(k,nm,sec,ang) in enumerate(cols):
    cx=110+i*180; cy=280; S=150
    g,adv=gl('o',S,cx,cy+52,F[k],2.4,'middle',hatch='h1'); b.append(g)
    # l'asse: inclinato quanto dice la classe
    # L'asse va centrato sul centro ottico della "o", non su un punto arbitrario:
    # la linea di base sta a cy+52, la bbox della "o" arriva a 0,44 em.
    ocy = cy + 52 - 0.22 * S
    r=52; a=math.radians(ang-90)
    x1,y1=cx+r*math.cos(a),ocy+r*math.sin(a); x2,y2=cx-r*math.cos(a),ocy-r*math.sin(a)
    b.append(ink(wobble_line(x1,y1,x2,y2,0.5),1.5,RED,dash='7 4'))
    b.append(f'<circle cx="{x1:.0f}" cy="{y1:.0f}" r="3.4" fill="{RED}"/>')
    b.append(f'<circle cx="{x2:.0f}" cy="{y2:.0f}" r="3.4" fill="{RED}"/>')
    b.append(label(cx,392,nm,'middle',15,INK))
    b.append(label(cx,410,sec,'middle',11,INK2,style='italic'))
    b.append(label(cx,430,f'{abs(ang)}° circa' if ang else 'verticale','middle',11,RED,style='italic'))
b.append(ink(wobble_line(60,462,880,462,0.6),1.0,INK2))
b.append(label(470,492,'L\'asse obliquo è l\'impronta del pennino tenuto inclinato; raddrizzandosi, la lettera smette','middle',11.5,INK2,style='italic'))
b.append(label(470,510,'di imitare la mano e comincia a essere costruita.','middle',11.5,INK2,style='italic'))
open(APP + '/plates/asse.svg','w').write(
 plate(W,H,''.join(b),title='L\'ASSE DI CONTRASTO',subtitle='Come si data un carattere guardando una sola lettera',figno='Tav. IV'))

# ══════════ TAV. V — CRENATURA E SPAZIATURA ══════════
W,H=940,600; seeded(53); b=[]
SER=F['tran']; S=170
def pair(x,y,a,b_,kern,tag,note_txt,color):
    o=[]
    g,adv=gl(a,S,x,y,SER,2.2); o.append(g)
    g2,_=gl(b_,S,x+adv+kern,y,SER,2.2); o.append(g2)
    # il vuoto fra le due lettere, campito a tratteggio
    o.append(f'<path d="M {x+adv*0.55},{y-S*0.66} L {x+adv+kern+S*0.06},{y-S*0.66} '
             f'L {x+adv+kern+S*0.06},{y} L {x+adv*0.55},{y} Z" fill="url(#h2)" opacity="0.22"/>')
    o.append(caps(x+adv/2+18,y+42,tag,size=11,color=color))
    o.append(label(x+adv/2+18,y+64,note_txt,'middle',11,INK2,style='italic'))
    return ''.join(o)
b.append(pair(120,300,'A','V',0,'SENZA CRENATURA','il vuoto spezza la parola',INK2))
b.append(pair(520,300,'A','V',-46,'CON CRENATURA','lo spazio pareggia otticamente',RED))
b.append(ink(wobble_line(470,150,470,380,0.7),1.0,INK2,dash='6 5'))
# terza figura: la stessa coppia in piccolo, ripetuta in parola
b.append(ink(wobble_line(60,412,880,412,0.6),1.1))
b.append(caps(470,446,'LO STESSO PRINCIPIO IN PAROLA',size=11,color=INK2))
x=250
for i,ch in enumerate('AVANTI'):
    g,adv=gl(ch,66,x,506,SER,1.6); b.append(g)
    x+=adv+(-9 if ch=='A' and i==0 else 0)
b.append(label(470,548,'La crenatura agisce su coppie singole; l\'avvicinamento su tutto il blocco.','middle',11.5,INK2,style='italic'))
b.append(label(470,566,'Allargare le minuscole di un testo corrente è invece considerato un errore.','middle',11.5,INK2,style='italic'))
open(APP + '/plates/crenatura.svg','w').write(
 plate(W,H,''.join(b),title='CRENATURA',subtitle='Perché due lettere vicine non bastano a fare una parola',figno='Tav. V'))

# ══════════ TAV. VI — TIPOMETRIA ══════════
W,H=940,660; seeded(67); b=[]

# ── Il carattere di piombo, per mostrare che cos'è il « corpo » ──
BX,BY,BW,BH=136,168,220,286
b.append(ink(wobble_rect(BX,BY,BW,BH,0.8),2.0))
b.append(f'<path d="M {BX},{BY} L {BX+22},{BY-22} L {BX+BW+22},{BY-22} L {BX+BW},{BY} Z" fill="url(#h1)" opacity="0.3"/>')
b.append(ink(f'M {BX},{BY} L {BX+22},{BY-22} L {BX+BW+22},{BY-22} L {BX+BW},{BY} Z',1.4))
b.append(f'<path d="M {BX+BW},{BY} L {BX+BW+22},{BY-22} L {BX+BW+22},{BY+BH-22} L {BX+BW},{BY+BH} Z" fill="url(#hx)" opacity="0.28"/>')
b.append(ink(f'M {BX+BW},{BY} L {BX+BW+22},{BY-22} L {BX+BW+22},{BY+BH-22} L {BX+BW},{BY+BH} Z',1.4))
# a rovescio, come sul carattere vero
d,_=glyph_path(F['tran'],'R',142,0,0)
b.append(f'<g transform="translate({BX+BW/2+48},{BY+214}) scale(-1,1)">'
         f'<path d="{d}" fill="url(#h1)" opacity="0.26"/>'
         f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/></g>')
# quota del corpo
QX=BX-42
b.append(ink(wobble_line(QX,BY,QX,BY+BH,0.4),1.2,RED))
for yy in (BY,BY+BH):
    b.append(ink(wobble_line(QX-8,yy,QX+8,yy,0.3),1.2,RED))
b.append(f'<g transform="rotate(-90 {QX-14} {BY+BH/2})">'+label(QX-14,BY+BH/2,'corpo','middle',13,RED,style='italic')+'</g>')
b.append(label(BX+BW/2,BY+BH+30,'il corpo è l\'altezza del blocco, non della lettera','middle',11,INK2,style='italic'))
b.append(label(BX+BW/2,BY+BH+48,'la lettera è a rovescio: si raddrizza solo sulla carta','middle',10.5,RED,style='italic'))

# ── Le quattro scale, tutte sulla stessa lunghezza fisica ──
# Sessanta millimetri reali, tracciati con lo stesso rapporto: solo così il
# confronto è vero e si vede a occhio che il punto Didot è più grande del
# Pica. È il principio del tipometro, che affianca la scala decimale a
# quella duodecimale sullo stesso righello.
SX, SY, GAP = 500, 210, 74
MM, SPAN = 5.3, 60

b.append(caps(SX + SPAN*MM/2, 158, 'LE QUATTRO SCALE, SULLA STESSA LUNGHEZZA', size=11))

SCALES = [
    ('cm',      INK, 10.0,  10, 2, '1 cm = 10 mm'),
    ('pollice', INK, 25.4,   8, 2, '1 inch = 25,4 mm = 72 punti PostScript'),
    ('Didot',   RED,  4.512,12, 2, '1 riga (cicero) = 12 pt  ·  1 pt = 0,376 mm'),
    ('Pica',    RED,  4.212,12, 2, '1 pica = 12 pt  ·  1 pt = 0,351 mm'),
]
for j,(nm,col,major,minor,med,leg) in enumerate(SCALES):
    yy = SY + j*GAP
    b.append(ink(wobble_line(SX, yy, SX+SPAN*MM, yy, 0.35), 1.3, col))
    step = major/minor
    i = 0
    while i*step <= SPAN + 1e-6:
        x = SX + i*step*MM
        if i % minor == 0:            h,w = 18, 1.3
        elif i % (minor//med) == 0:   h,w = 11, 0.95
        else:                         h,w = 5.5, 0.65
        b.append(ink(wobble_line(x, yy, x, yy-h, 0.22), w, col))
        i += 1
    # numerazione: sotto la linea, così non urta la scala di sopra
    n = 1
    while n*major <= SPAN + 1e-6:
        b.append(label(SX + n*major*MM, yy+12, str(n), 'middle', 8, col))
        n += 1
    b.append(label(SX-12, yy+4, nm, 'end', 12.5, col))
    b.append(label(SX, yy+27, leg, 'start', 9.5, INK2, style='italic'))

# ── Chiusa ──
b.append(ink(wobble_line(60,548,880,548,0.6),1.0,INK2))
b.append(label(470,576,'Il punto Didot nasce dal « piede del re »: ne è la 864ª parte. Il punto Pica dal pollice inglese.','middle',11,INK2,style='italic'))
b.append(label(470,594,'Il punto PostScript, oggi lo standard digitale, vale esattamente 1/72 di pollice: 0,3528 mm.','middle',11,INK2,style='italic'))
b.append(label(470,612,'Due caratteri nello stesso corpo possono apparire di dimensioni diverse: ciò che si vede è l\'altezza-x.','middle',11,INK2,style='italic'))

open(APP + '/plates/tipometria.svg','w').write(
 plate(W,H,''.join(b),title='TIPOMETRIA',subtitle='Il corpo, il punto e le quattro scale a confronto',figno='Tav. VI'))
print('tre tavole create')
