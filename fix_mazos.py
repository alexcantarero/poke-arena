import re

with open('src/app/(app)/mazos/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the accidental replacements
content = re.sub(r'  const filteredArchetypes = snap\.archetypes\.filter.*?\n\s+return \(', '  return (', content, flags=re.DOTALL)

# Re-insert the proper logic once
proper_logic = '''  const filteredArchetypes = snap.archetypes.filter((a) => {
    if (!needle) return true;
    return a.name.toLowerCase().includes(needle) || (a.main ?? "").includes(needle) || (a.secondary ?? "").includes(needle);
  });

  return ('''
content = content.replace('  const clearHref = view === "all" ? "/mazos" : /mazos?ver=;', '  const clearHref = view === "all" ? "/mazos" : /mazos?ver=;\n\n' + proper_logic)

# Fix the section title
content = content.replace('<SectionTitle aside={}>', '<SectionTitle aside={${filteredArchetypes.length}}>')

with open('src/app/(app)/mazos/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
