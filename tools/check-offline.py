import re, pathlib, json
ok, fail = [], []
def t(name, cond, extra=""):
    (ok if cond else fail).append(name + (f" → {extra}" if not cond and extra else ""))

html = pathlib.Path('index.html').read_text()
css  = pathlib.Path('style.css').read_text()
sw   = pathlib.Path('sw.js').read_text()

# 1. Nessuna risorsa esterna (a parte l'API, che è opzionale e online per forza)
ext_html = re.findall(r'(?:href|src)="(https?://[^"]+)"', html)
t("index.html: nessuna risorsa esterna", not ext_html, str(ext_html))
ext_css = re.findall(r"url\((https?://[^)]+)\)", css)
t("style.css: nessuna risorsa esterna", not ext_css, str(ext_css))

# 2. Ogni font citato nel CSS esiste su disco
urls = re.findall(r"url\('([^']+)'\)", css)
missing = [u for u in urls if not pathlib.Path(u).exists()]
t(f"style.css: tutti i {len(urls)} font presenti su disco", not missing, str(missing))

# 3. Nessun TTF residuo
ttf = list(pathlib.Path('fonts').rglob('*.ttf'))
t("nessun TTF residuo (solo WOFF2)", not ttf, str([p.name for p in ttf]))

# 4. Il service worker mette in cache tutto il necessario
assets = re.findall(r"'([^']+)',", re.search(r"const ASSETS = \[([\s\S]*?)\];", sw).group(1))
assets_set = set(assets)
not_cached = [u for u in urls if u not in assets_set]
t("service worker: tutti i font in cache", not not_cached, str(not_cached))
sw_missing = [a for a in assets if a != './' and not pathlib.Path(a).exists()]
t(f"service worker: tutti i {len(assets)} asset esistono", not sw_missing, str(sw_missing))

# 5. Le immagini dell'HTML/JS sono in cache
data = pathlib.Path('data.js').read_text()
imgs = re.findall(r"img:\s*'([^']+)'", data)
img_missing = [i for i in imgs if i not in assets_set]
t(f"service worker: tutte le {len(imgs)} foto in cache", not img_missing, str(img_missing))

# 6. Versione cache incrementata
ver = re.search(r"CACHE_VERSION = '([^']+)'", sw).group(1)
t(f"CACHE_VERSION incrementata ({ver})", ver != 'glifo-v1', ver)

# 7. Ogni famiglia usata nei campioni ha un @font-face
fams_css = set(re.findall(r"font-family: '([^']+)'", css)) | set(re.findall(r"font-family:'([^']+)'", css))
fams_used = set(re.findall(r"font:\s*\"'([^']+)'", data))
missing_fam = fams_used - fams_css
t(f"tutte le {len(fams_used)} famiglie campione hanno un @font-face", not missing_fam, str(missing_fam))

# 8. La versione nel footer deve coincidere con quella del service worker,
#    altrimenti il numero mostrato mente su quale copia si sta guardando.
app_v = re.search(r"APP_VERSION = '([^']+)'", pathlib.Path('data.js').read_text()).group(1)
sw_v = re.search(r"CACHE_VERSION = 'glifo-([^']+)'", sw).group(1)
t(f"versione footer = versione service worker ({app_v})", app_v == sw_v, f"{app_v} vs {sw_v}")

# 9. Manifest valido e icona presente
man = json.loads(pathlib.Path('manifest.webmanifest').read_text())
t("manifest: icona presente", pathlib.Path(man['icons'][0]['src']).exists())

print("──── PASSATI (%d) ────" % len(ok))
for x in ok: print("  ✓", x)
if fail:
    print("\n──── FALLITI (%d) ────" % len(fail))
    for x in fail: print("  ✗", x)
print(f"\n{len(ok)}/{len(ok)+len(fail)} controlli offline superati")
