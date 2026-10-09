import re
text = open('src/app/api/cards/route.ts', 'r', encoding='utf-8').read()
text = text.replace('pokemontcg', 'tcgdex')
open('src/app/api/cards/route.ts', 'w', encoding='utf-8').write(text)
