import re
text = open('src/app/(app)/ajustes/page.tsx', 'r', encoding='utf-8').read()

# 1. Remove setFeaturedRegional import
text = re.sub(r'import \{ setFeaturedRegional \} from "@/actions";\n', '', text)
# 2. Remove MetaImport import
text = re.sub(r'import \{ MetaImport \} from "@/components/MetaImport";\n', '', text)
# 3. Add deleteMetaEvent import
text = text.replace('import { Icon } from "@/components/icons";', 'import { deleteMetaEvent } from "@/actions";\nimport { Icon } from "@/components/icons";')
# 4. Add fmtDate import if missing. Wait, fmtDate might already be imported? Let's check.
text = text.replace('import { canManageLeague', 'import { fmtDate } from "@/lib/format";\nimport { canManageLeague')

# 5. Replace the Metagame presencial Grupo
rep_meta = '''          <Grupo titulo="Eventos importados del metagame" aside={`${metaEventos.length} eventos`}>
            {metaEventos.length === 0 ? (
              <p className="card p-4 text-sm text-muted">Aún no se ha importado ningún evento.</p>
            ) : (
              <div className="card mb-6">
                <ul className="divide-y divide-line-soft">
                  {metaEventos.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{e.name}</span>
                        <span className="block text-[11px] text-muted tabular">
                          {fmtDate(e.date)}
                          {e.location && ` · ${e.location}`}
                          {e.entries && ` · ${e.entries} lista(s)`}
                          {e.coverage != null && ` · top ${e.coverage}`}
                          {e.sourceName && ` · ${e.sourceName}`}
                        </span>
                      </span>
                      <form action={deleteMetaEvent}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="btn btn-ghost btn-sm text-loss" type="submit"
                          aria-label={`Quitar ${e.name}`}>
                          <Icon name="trash" className="size-4" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Grupo>'''

text = re.sub(r'\s*<Grupo titulo="Metagame presencial" aside="pegando la clasificaci.n">.*?</Grupo>', '\n' + rep_meta, text, flags=re.DOTALL)

open('src/app/(app)/ajustes/page.tsx', 'w', encoding='utf-8').write(text)
