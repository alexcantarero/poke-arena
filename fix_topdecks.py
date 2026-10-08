# -*- coding: utf-8 -*-
import re

with open('src/app/(app)/topdecks/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add query type and parsed query
text = text.replace('Promise<{ formato?: string; dias?: string; fuente?: string }>', 'Promise<{ formato?: string; dias?: string; fuente?: string; q?: string }>')
text = text.replace('const presencial = q.fuente === "presencial";', 'const presencial = q.fuente === "presencial";\n  const query = (q.q ?? "").trim();\n  const needle = query.toLowerCase();')

# Update MetaIrlTable
text = text.replace('<MetaIrlTable meta={metaIrl} nuestros={nuestros} />', '<MetaIrlTable meta={metaIrl} nuestros={nuestros} query={query} />')

# Add search form after {pestanas} (Note: {pestanas} appears twice, one for presencial, one for online)
# It's better to insert it into const pestanas = ( itself or just right after {pestanas} in both branches!
form_html = '''{pestanas}
        <form action="/topdecks" method="get" className="mb-4 flex gap-2">
          {presencial && <input type="hidden" name="fuente" value="presencial" />}
          {formato !== "STANDARD" && <input type="hidden" name="formato" value={formato} />}
          {dias !== 30 && <input type="hidden" name="dias" value={dias} />}
          <input
            className="input min-w-0 flex-1" type="search" name="q" defaultValue={query}
            placeholder="Buscar arquetipo o Pok\u00e9mon..." aria-label="Buscar arquetipo"
            autoComplete="off" autoCapitalize="none" spellCheck={false}
          />
          <button className="btn shrink-0" type="submit" aria-label="Buscar">
            <Icon name="search" className="size-4" />
          </button>
        </form>'''

text = text.replace('{pestanas}', form_html)

# Update limitless limit
text = text.replace('limit: dias > 30 ? 40 : 25,', 'limit: 100,')

# Update online filas logic
target_online_filas = 'const filas = (meta?.rows ?? []).slice(0, 24);'
replacement_online_filas = '''const filas = (meta?.rows ?? []).filter((r) => {
    if (!needle) return true;
    return r.name.toLowerCase().includes(needle) || (r.main ?? "").includes(needle) || (r.secondary ?? "").includes(needle);
  }).slice(0, 100);'''
text = text.replace(target_online_filas, replacement_online_filas)

# ensure search string is kept in tabs and pills
text = text.replace('const sp = new URLSearchParams({ formato, dias: String(dias), ...cambios });', 'const sp = new URLSearchParams({ formato, dias: String(dias), ...(query ? { q: query } : {}), ...cambios });')
text = text.replace('href="/topdecks"', 'href={/topdecks}')
text = text.replace('href="/topdecks?fuente=presencial"', 'href={/topdecks?fuente=presencial}')

with open('src/app/(app)/topdecks/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)