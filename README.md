# Generatore delle tavole

Gli script che producono i file in `../plates/`. Non servono per far
funzionare l'app: servono solo se si vogliono modificare o aggiungere tavole.

```
pip install fonttools brotli cairosvg
python3 p1_anatomia.py    # Tav. I
python3 p2_gotiche.py     # Tav. II
python3 p3_punzone.py     # Tav. III
python3 p456.py           # Tav. IV, V, VI
```

- `lib.py` — cornice, tratto tremolante, tratteggio, carta invecchiata
- `glyphs.py` — estrae i contorni dei glifi dai font con fontTools

Gli script scrivono in `/sessions/.../out_*.svg`: cambiare il percorso in
fondo a ciascuno prima di rieseguirli.
