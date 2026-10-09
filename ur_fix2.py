import re
text = open('src/components/UltimoRegional.tsx', 'r', encoding='utf-8').read()

rep = '''export type CabeceraEvento = {
  id?: string;
  name: string;'''
text = re.sub(r'export type CabeceraEvento = \{\n  name: string;', rep, text)

open('src/components/UltimoRegional.tsx', 'w', encoding='utf-8').write(text)
