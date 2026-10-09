text = open('src/app/(app)/page.tsx', 'r', encoding='utf-8').read()

lines = text.split('\n')
out = []
i = 0
while i < len(lines):
    line = lines[i]
    if line.strip() == 'import { Icon } from "@/components/icons";' and 'personalId' not in text:
        out.append('import { cookies } from "next/headers";')
        out.append(line)
        i += 1
        continue
    
    if line.strip() == 'if (vista === "global") {':
        out.append('    const personalId = (await cookies()).get("personalRegional")?.value;')
        out.append(line)
        i += 3
        out.append('      const elegido = personalId ? irl.events.find((e) => e.id === personalId) : undefined;')
        i += 1
        continue
        
    if line.strip() == 'href: ev.sourceUrl || null,':
        out.append(line)
        out.append('          id: ev.id,')
        out.append('        } : null,')
        out.append('        regionales: deTemporada,')
        i += 2
        continue

    if line.strip() == '} else {':
        out.append(line)
        i += 3
        out.append('      const fechaElegida = personalId ? irl.events.find((e) => e.id === personalId)?.date : undefined;')
        i += 1
        continue

    out.append(line)
    i += 1

open('src/app/(app)/page.tsx', 'w', encoding='utf-8').write('\n'.join(out))
