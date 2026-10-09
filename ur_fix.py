import re
text = open('src/components/UltimoRegional.tsx', 'r', encoding='utf-8').read()

if 'import { setPersonalRegional }' not in text:
    text = text.replace('import { OtherMark } from "./ui";', 'import { OtherMark } from "./ui";\nimport { setPersonalRegional } from "@/actions";')

rep_type = '''  /** C.mo se llama la conversi.n en esta vista: cambia el denominador. */
  etiquetaConversion: string;
  regionales?: Array<{ id: string; name: string; date: string }>;'''

text = re.sub(r'  /\*\* C.mo se llama la conversi.n en esta vista: cambia el denominador\. \*/\n  etiquetaConversion: string;', rep_type, text)

rep_html = '''    <section id="ultimo-regional" className="mb-4 scroll-mt-20">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        {p.vista === "global" && p.regionales ? (
          <form action={setPersonalRegional} className="flex items-center gap-2 max-w-full">
            <select name="regionalId" className="font-display text-xl font-extrabold bg-transparent hover:bg-surface-2 cursor-pointer outline-none max-w-[200px] sm:max-w-xs truncate rounded" defaultValue={p.evento?.id ?? ""} onChange={(e) => e.target.form?.requestSubmit()}>
              {p.regionales.map(r => (
                <option key={r.id} value={r.id} className="text-base font-sans">{r.name}</option>
              ))}
            </select>
          </form>
        ) : (
          <h2 className="font-display text-xl font-extrabold">El último Regional</h2>
        )}'''

text = re.sub(r'    <section id="ultimo-regional" className="mb-4 scroll-mt-20">\n      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">\n        <h2 className="font-display text-xl font-extrabold">El ǟ.ltimo Regional</h2>', rep_html, text)

# Just in case `El último Regional` wasn't exactly that sequence of characters because of powershell encoding.
text = re.sub(r'    <section id="ultimo-regional" className="mb-4 scroll-mt-20">\n      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">\n        <h2 className="font-display text-xl font-extrabold">.*?</h2>', rep_html, text)

open('src/components/UltimoRegional.tsx', 'w', encoding='utf-8').write(text)
