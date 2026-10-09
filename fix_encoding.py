import os
path = 'src/app/(app)/partidas/[id]/page.tsx'
content = open(path, 'r', encoding='utf-16le').read()
open(path, 'w', encoding='utf-8').write(content)
