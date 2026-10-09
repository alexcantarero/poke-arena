import re
text = open('src/app/(app)/page.tsx', 'r', encoding='utf-8').read()

text = text.replace('import { Icon } from "@/components/icons";', 'import { cookies } from "next/headers";\nimport { Icon } from "@/components/icons";')

rep1 = '''    const personalId = (await cookies()).get("personalRegional")?.value;
    if (vista === "global") {
      const elegido = personalId
        ? irl.events.find((e) => e.id === personalId) : undefined;'''

text = re.sub(r'    if \(vista === "global"\) \{\n      // v0\.25: si un organizador eligi. el .ltimo Regional. en Ajustes, manda ese\.\n      const elegido = snap\.config\.featuredRegionalId\n        \? irl\.events\.find\(\(e\) => e\.id === snap\.config\.featuredRegionalId\) : undefined;', rep1, text)

rep_panel = '''      const deTemporada = irl.events.filter((e) => KINDS_REGIONAL.has(e.kind) && (e.season ?? seasonOfDate(e.date)) === temporada);
      const top = irlMeta(deTemporada, irl.entries.filter((e) => deTemporada.some((d) => d.id === e.eventId)));
      panel = {
        vista, hrefs,
        evento: ev ? {
          name: ev.name, date: fechaCorta(ev.date), location: ev.location || null,
          playerCount: ev.playerCount,
          muestra: `top ${ev.coverage ?? ev.topCut ?? ""} importado`,
          href: ev.sourceUrl || null,
          id: ev.id,
        } : null,
        regionales: deTemporada,
        ...p,
        top: top.slice(0, 5), topNota: `De los ${deTemporada.length} grandes de la temporada.`,
        recientes: deTemporada.slice(0, 5).map((e) => ({
          key: e.id, date: fechaCorta(e.date), name: e.name, tipo: e.kind,
          href: e.sourceUrl || null,
          aside: e.playerCount ? `${e.playerCount.toLocaleString("es")} jug.` : undefined,
        })),
        vacio: "Aún no se ha importado el primer Regional de la temporada.",
      };'''

text = re.sub(r'      const deTemporada = irl\.events\.filter\(\(e\) => KINDS_REGIONAL\.has\(e\.kind\) && \(e\.season \?\? seasonOfDate\(e\.date\)\) === temporada\);\n      const top = irlMeta\(deTemporada, irl\.entries\.filter\(\(e\) => deTemporada\.some\(\(d\) => d\.id === e\.eventId\)\)\);\n      panel = \{\n        vista, hrefs,\n        evento: ev \? \{\n          name: ev\.name, date: fechaCorta\(ev\.date\), location: ev\.location \|\| null,\n          playerCount: ev\.playerCount,\n          muestra: `top \$\{ev\.coverage \?\? ev\.topCut \?\? ""\} importado`,\n          href: ev\.sourceUrl \|\| null,\n        \} : null,\n        \.\.\.p,\n        top: top\.slice\(0, 5\), topNota: `De los \$\{deTemporada\.length\} grandes de la temporada\.`,\n        recientes: deTemporada\.slice\(0, 5\)\.map\(\(e\) => \(\{\n          key: e\.id, date: fechaCorta\(e\.date\), name: e\.name, tipo: e\.kind,\n          href: e\.sourceUrl \|\| null,\n          aside: e\.playerCount \? `\$\{e\.playerCount\.toLocaleString\("es"\)\} jug\.` : undefined,\n        \}\)\),\n        vacio: "A.n no se ha importado el primer Regional de la temporada\.",\n      \};', rep_panel, text)

rep2 = '''    } else {
      const fechaElegida = personalId
        ? irl.events.find((e) => e.id === personalId)?.date : undefined;'''

text = re.sub(r'    \} else \{\n      // v0\.25: con un Regional elegido, el torneo del grupo de esa misma fecha\.\n      const fechaElegida = snap\.config\.featuredRegionalId\n        \? irl\.events\.find\(\(e\) => e\.id === snap\.config\.featuredRegionalId\)\?\.date : undefined;', rep2, text)

open('src/app/(app)/page.tsx', 'w', encoding='utf-8').write(text)
