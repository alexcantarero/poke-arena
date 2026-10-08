import os
import re

with open('src/app/(app)/mazos/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def fix_mojibake(match):
    try:
        return match.group(0).encode('windows-1252').decode('utf-8')
    except:
        return match.group(0)

# The corruption happened because of powershell.
# I'll manually replace the known corrupted characters if needed.
text = text.replace('a??s?\'?"', '—')
text = text.replace('a?s\'', '—')
text = text.replace('Ninga\'\'n', 'Ningún')
text = text.replace('todava\'\'a', 'todavía')
text = text.replace('estantera\'\'a', 'estantería')
text = text.replace('coma\'\'n', 'común')
text = text.replace('esta\'\' vaca\'\'a', 'está vacía')

# We also need to fix the stray syntax errors from the bad replace!
# Let's clean up the multiple ilteredArchetypes declarations if they exist.
text = re.sub(r'const filteredArchetypes = snap\.archetypes.*?return \(', 'return (', text, flags=re.DOTALL)

with open('src/app/(app)/mazos/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
