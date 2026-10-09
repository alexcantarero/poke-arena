text = open('src/app/(app)/page.tsx', 'r', encoding='utf-8').read()
idx = text.find('if (vista === "global") {')
print(repr(text[idx:idx+250]))
