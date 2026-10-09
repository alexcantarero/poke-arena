import re
text = open('src/app/(app)/page.tsx', 'r', encoding='utf-8').read()

text = re.sub(r'(import \{ cookies \} from "next/headers";\n)+', 'import { cookies } from "next/headers";\n', text)

open('src/app/(app)/page.tsx', 'w', encoding='utf-8').write(text)
