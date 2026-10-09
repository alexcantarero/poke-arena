import re
text = open('src/app/(app)/page.tsx', 'r', encoding='utf-8').read()

if 'personalId' not in text:
    text = text.replace('import { Icon } from "@/components/icons";', 'import { cookies } from "next/headers";\nimport { Icon } from "@/components/icons";')

    text = text.replace(
        '    if (vista === "global") {\n      // v0.25: si un organizador eligió el «Último Regional» en Ajustes, manda ese.\n      const elegido = snap.config.featuredRegionalId\n        ? irl.events.find((e) => e.id === snap.config.featuredRegionalId) : undefined;',
        '    const personalId = (await cookies()).get("personalRegional")?.value;\n    if (vista === "global") {\n      const elegido = personalId\n        ? irl.events.find((e) => e.id === personalId) : undefined;'
    )

    text = text.replace(
        '          href: ev.sourceUrl || null,\n        } : null,',
        '          href: ev.sourceUrl || null,\n          id: ev.id,\n        } : null,\n        regionales: deTemporada,'
    )

    text = text.replace(
        '    } else {\n      // v0.25: con un Regional elegido, el torneo del grupo de esa misma fecha.\n      const fechaElegida = snap.config.featuredRegionalId\n        ? irl.events.find((e) => e.id === snap.config.featuredRegionalId)?.date : undefined;',
        '    } else {\n      const fechaElegida = personalId\n        ? irl.events.find((e) => e.id === personalId)?.date : undefined;'
    )

open('src/app/(app)/page.tsx', 'w', encoding='utf-8').write(text)
