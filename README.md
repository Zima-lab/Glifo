# Glifo

Atelier di tipografia — app web offline (PWA) in italiano, inglese e tedesco.

## Cosa contiene

- **Glossario** — 14 classificazioni Vox-ATypI, ciascuna con nome nelle tre lingue, epoca, descrizione, esempi di caratteri e campione tipografico reale
- **Anatomia** — 37 termini fra linee di costruzione e parti della lettera
- **Tecnica** — 20 voci fra tecnologie di stampa (dal punzone al digitale), tipometria (punto Didot e Pica, tipometro) e parametri di composizione
- **Type** — carte d'identità dei caratteri: scheda-specimen colorata che apre storia, « come riconoscerlo », « dove trovarlo » e link di approfondimento
- **Sei tavole illustrate** in stile enciclopedia ottocentesca
- **Storia** — timeline di 23 eventi, da Gutenberg (1450) ai font variabili (2016)
- **Designer** — 14 schede biografiche
- **Esercizi** — quattro quiz da 8 domande (classificazione, terminologia, tecnica, storia)
- **Profilo** — XP, livelli e statistiche di avanzamento
- Tema chiaro/scuro, funziona **interamente offline**, si installa sul telefono

## File

| File | Cosa contiene |
|---|---|
| `index.html` | struttura della pagina |
| `style.css` | stile, temi e caratteri |
| `data.js` | **i contenuti** — per aggiungere voci si modifica solo questo |
| `app.js` | logica dell'app |
| `sw.js` | service worker (funzionamento offline) |
| `manifest.webmanifest` | dati per l'installazione come app |
| `fonts/` | Blacker Pro Text e Blacker Sans Pro (interfaccia) |
| `fonts/specimen/` | le 14 famiglie dei campioni tipografici |
| `img/` | ritratti dei designer |
| `plates/` | le sei tavole illustrate |
| `CLAUDE.md` | fonti verificabili e regole di contenuto |
| `NOTICE.md` | che cosa copre la licenza e che cosa no |
| `icons/`, `favicon.ico` | icone dell'app e della scheda del browser |

## Caratteri

Tutti i font sono **locali**: nessuna richiesta a Google Fonts, così i
campioni del glossario si vedono identici anche offline.

- **Interfaccia** — Blacker Pro Text (titoli) e Blacker Sans Pro (testo),
  convertiti da TTF a WOFF2: da 1,9 MB a 668 KB.
- **Campioni** — le quattordici famiglie che illustrano le classificazioni,
  limitate al sottoinsieme `latin`: 608 KB in tutto.

## Provarla in locale

I service worker e i moduli non funzionano aprendo il file con doppio clic
(protocollo `file://`). Serve un piccolo server locale:

```
cd "Glifo App"
python3 -m http.server 8000
```

Poi aprire <http://localhost:8000>.

## Pubblicare su GitHub Pages

1. Creare un repository e caricarci il contenuto di questa cartella
   (i file alla radice, non la cartella stessa).
2. Impostazioni → Pages → Source: *Deploy from a branch*, ramo `main`,
   cartella `/ (root)`.
3. Il file `.nojekyll` è già presente e serve: senza, GitHub ignorerebbe
   alcune cartelle e i caratteri non verrebbero serviti.
4. Attendere qualche minuto. Il CDN di GitHub serve i file vecchi per circa
   dieci minuti dopo il commit: ricaricare forzatamente con ⌘⇧R.

L'app funziona solo in **https** o su `localhost` — è un requisito dei
service worker. GitHub Pages fornisce https automaticamente.

## Aggiornare la versione pubblicata

Dopo aver caricato file modificati vanno incrementati **due** numeri, che
devono restare uguali:

- `CACHE_VERSION` in `sw.js` — da `glifo-v8` a `glifo-v9`
- `APP_VERSION` in `data.js` — da `v8` a `v9`

Il primo forza i dispositivi a scaricare la versione nuova invece di usare
la copia in cache. Il secondo è quello che compare in fondo a ogni pagina:
aprendo l'app sul telefono dice subito se si sta guardando l'ultima
pubblicazione o una copia vecchia.

Prima di pubblicare conviene lanciare i controlli:

```
sh tools/check.sh
```

Verifica la sintassi dei file JS, che tutti gli asset citati esistano e che
i due numeri di versione coincidano.

## Le tavole illustrate

Le sei tavole in `plates/` sono nello stile delle enciclopedie dell'Ottocento:
disegno a contorno, tratteggio a bulino, annotazioni in rosso minio su carta
invecchiata. I glifi sono contorni vettoriali veri, estratti dai font; cornice
e richiami sono tracciati con un tremolio controllato che imita la penna.

| Tav. | Soggetto |
|---|---|
| I | Anatomia della lettera e linee di costruzione |
| II | Le scritture gotiche e la rottura dell'arco |
| III | Dal punzone alla carta |
| IV | L'asse di contrasto attraverso i secoli |
| V | La crenatura |
| VI | Tipometria: il corpo e le due scale |

## Fonti

Date, definizioni e attribuzioni sono verificate su repertori specialistici
(*The Encyclopaedia of Typefaces*, Bringhurst), enciclopedie (Treccani,
Britannica, Wikipedia), manuali didattici italiani e letteratura scientifica
per la parte sulla leggibilità.

`CLAUDE.md` contiene la bibliografia completa — una quarantina di titoli fra
manuali, repertori, monografie e fonti dirette dei protagonisti — la
sitografia e le regole per aggiungere contenuti.

## Licenze

Il codice è sotto GPL-2.0 (vedi `LICENSE`). **I caratteri e le immagini no**:
hanno licenze proprie che la GPL non può concedere. I dettagli sono in
`NOTICE.md`.

In breve: Blacker Pro (Latinotype) è sotto licenza per uso non commerciale e
non è riutilizzabile; i campioni in `fonts/specimen/` hanno licenza SIL OFL e
sono liberi.
