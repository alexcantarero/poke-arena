import re
text = open('src/actions/index.ts', 'r', encoding='utf-8').read()
text = text.replace('import { cookies } from "next/headers";\nexport async function setPersonalRegional', 'export async function setPersonalRegional')
open('src/actions/index.ts', 'w', encoding='utf-8').write(text)
