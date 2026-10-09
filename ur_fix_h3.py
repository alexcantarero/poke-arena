import re
text = open('src/components/UltimoRegional.tsx', 'r', encoding='utf-8').read()

# Revert h2
text = re.sub(
    r'        \{p\.vista === "global" && p\.regionales \? \(\n.*?</form>\n\s*\) : \(\n\s*<h2 className="font-display text-xl font-extrabold">El último Regional</h2>\n\s*\)\}',
    '<h2 className="font-display text-xl font-extrabold">El último Regional</h2>',
    text, flags=re.DOTALL
)
# Revert h2 for corrupted encoding
text = re.sub(
    r'        \{p\.vista === "global" && p\.regionales \? \(\n.*?</form>\n\s*\) : \(\n\s*<h2 className="font-display text-xl font-extrabold">.*?</h2>\n\s*\)\}',
    '<h2 className="font-display text-xl font-extrabold">El último Regional</h2>',
    text, flags=re.DOTALL
)

# Apply to h3
rep_h3 = '''              <h3 className="font-display text-2xl font-extrabold leading-tight">
                {p.vista === "global" && p.regionales ? (
                  <form action={setPersonalRegional} className="inline-block relative">
                    <select name="regionalId" className="appearance-none bg-transparent hover:bg-surface-2 cursor-pointer outline-none rounded pr-6 truncate max-w-full" defaultValue={p.evento?.id ?? ""} onChange={(e) => e.target.form?.requestSubmit()}>
                      {p.regionales.map(r => (
                        <option key={r.id} value={r.id} className="text-base font-sans">{r.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-1">
                      <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </form>
                ) : p.evento.href ? (
                  <Link href={p.evento.href} className="hover:text-info">{p.evento.name}</Link>
                ) : (
                  p.evento.name
                )}
              </h3>'''

text = re.sub(r'              <h3 className="font-display text-2xl font-extrabold leading-tight">\n\s*\{p\.evento\.href\n\s*\? <Link href=\{p\.evento\.href\} className="hover:text-info">\{p\.evento\.name\}</Link>\n\s*: p\.evento\.name\}\n\s*</h3>', rep_h3, text)

open('src/components/UltimoRegional.tsx', 'w', encoding='utf-8').write(text)
