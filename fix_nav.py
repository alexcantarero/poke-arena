import re
text = open('src/lib/nav.ts', 'r', encoding='utf-8').read()

rep = '''    items: [
      { href: "/torneos", label: "Torneos", icon: "trophy" },
      { href: "/competiciones", label: "Liga", icon: "league" },
      { href: "/resultados", label: "Resultados", icon: "results" },
      { href: "/mesa", label: "Mi Mesa", icon: "plus" },'''

text = text.replace('    items: [\n      { href: "/torneos", label: "Torneos", icon: "trophy" },\n      { href: "/competiciones", label: "Liga", icon: "league" },\n      { href: "/resultados", label: "Resultados", icon: "results" },', rep)

open('src/lib/nav.ts', 'w', encoding='utf-8').write(text)
