# -*- coding: utf-8 -*-
with open('src/components/MetaIrlTable.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = 'export function MetaIrlTable({ meta, nuestros }: { meta: IrlSummary; nuestros: Set<string> }) {'
replacement = 'export function MetaIrlTable({ meta, nuestros, query = "" }: { meta: IrlSummary; nuestros: Set<string>; query?: string }) {'
text = text.replace(target, replacement)

target2 = '  const filas = meta.rows.slice(0, 24);'
replacement2 = '''  const needle = query.toLowerCase();
  const filas = meta.rows.filter((r) => {
    if (!needle) return true;
    return r.name.toLowerCase().includes(needle) || (r.main ?? "").includes(needle) || (r.secondary ?? "").includes(needle);
  }).slice(0, 100);'''
text = text.replace(target2, replacement2)

with open('src/components/MetaIrlTable.tsx', 'w', encoding='utf-8') as f:
    f.write(text)