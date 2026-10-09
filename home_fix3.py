import re
text = open('src/app/(app)/page.tsx', 'r', encoding='utf-8').read()

if 'personalRegional' not in text:
    text = text.replace('import { Icon } from "@/components/icons";', 'import { cookies } from "next/headers";\nimport { Icon } from "@/components/icons";')

    text = re.sub(
        r'    if \(vista === "global"\) \{\n\s*// [^\n]*\n\s*const elegido = snap\.config\.featuredRegionalId\n\s*\? irl\.events\.find\(\(e\) => e\.id === snap\.config\.featuredRegionalId\) : undefined;',
        '    const personalId = (await cookies()).get("personalRegional")?.value;\n    if (vista === "global") {\n      const elegido = personalId\n        ? irl.events.find((e) => e.id === personalId) : undefined;',
        text
    )

    text = re.sub(
        r'          href: ev\.sourceUrl \|\| null,\n        \} : null,',
        '          href: ev.sourceUrl || null,\n          id: ev.id,\n        } : null,\n        regionales: deTemporada,',
        text
    )

    text = re.sub(
        r'    \} else \{\n\s*// [^\n]*\n\s*const fechaElegida = snap\.config\.featuredRegionalId\n\s*\? irl\.events\.find\(\(e\) => e\.id === snap\.config\.featuredRegionalId\)\?\.date : undefined;',
        '    } else {\n      const fechaElegida = personalId\n        ? irl.events.find((e) => e.id === personalId)?.date : undefined;',
        text
    )

open('src/app/(app)/page.tsx', 'w', encoding='utf-8').write(text)
