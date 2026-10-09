import re
text = open('src/app/(app)/ajustes/page.tsx', 'r', encoding='utf-8').read()
text = text.replace('import { hasPokemonTcgKey } from "@/lib/sources/pokemontcg";', 'import { hasPokemonTcgKey } from "@/lib/sources/tcgdex";')
text = re.sub(r'<li className="flex items-start gap-2">\s*<span className={`chip mt-0\.5 flex-none \$\{tcgKey \? "chip-win" : ""\}`>pokemontcg\.io</span>.*?</li>', '<li className="flex items-start gap-2">\n                <span className="chip mt-0.5 flex-none chip-win">TCGdex</span>\n                <span className="min-w-0 text-ink-2">\n                  Datos de carta para el buscador del editor de mazos. Usa la API p&uacute;blica de TCGdex sin necesidad de clave.\n                </span>\n              </li>', text, flags=re.DOTALL)
open('src/app/(app)/ajustes/page.tsx', 'w', encoding='utf-8').write(text)
