import re
text = open('src/app/(app)/estadisticas/page.tsx', 'r', encoding='utf-8').read()
match = re.search(r'\{focusRow\.played\} usos.*?\}', text)
print(repr(match.group(0)))
