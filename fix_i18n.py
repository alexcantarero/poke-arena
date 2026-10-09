import re
text = open('src/lib/i18n.ts', 'r', encoding='utf-8').read()

text = text.replace('"nav./resultados": "Resultados",', '"nav./resultados": "Resultados",\n  "nav./mesa": "Mi Mesa",')
text = text.replace('"nav./resultados": "Results",', '"nav./resultados": "Results",\n  "nav./mesa": "My Table",')

open('src/lib/i18n.ts', 'w', encoding='utf-8').write(text)
