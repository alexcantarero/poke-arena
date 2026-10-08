# -*- coding: utf-8 -*-
import re

with open('src/app/(app)/mazos/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '''  const filteredArchetypes = snap.archetypes.filter((a) => {
    if (!needle) return true;
    return a.name.toLowerCase().includes(needle) || (a.main ?? "").includes(needle) || (a.secondary ?? "").includes(needle);
  });

  return ('''

text = re.sub(r'  return \(', replacement, text, count=1)

with open('src/app/(app)/mazos/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)