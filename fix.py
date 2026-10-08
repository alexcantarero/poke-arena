# -*- coding: utf-8 -*-
import re

with open('src/app/(app)/mazos/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'const clearHref = .*?;', 'const clearHref = view === "all" ? "/mazos" : /mazos?ver=;', text)
text = re.sub(r'ǟ.*?squeda', 'búsqueda', text)
text = re.sub(r'ǟ.*?mon', 'Pokémon', text)

with open('src/app/(app)/mazos/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)