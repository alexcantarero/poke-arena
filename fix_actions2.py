import re
text = open('src/actions/index.ts', 'r', encoding='utf-8').read()

text = re.sub(
    r'  redirect\("/#ultimo-regional"\);\n\}\n\s*const existing = await db\.select.*?\n\}',
    '  redirect("/#ultimo-regional");\n}',
    text, flags=re.DOTALL
)

open('src/actions/index.ts', 'w', encoding='utf-8').write(text)
