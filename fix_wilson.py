import re
text = open('src/lib/stats.ts', 'r', encoding='utf-8').read()
if 'wilsonScore' not in text:
    text += '\n\n/**\n * Intervalo de Wilson para un % de victorias (95% de confianza).\n * Devuelve [centro, lower_bound, upper_bound].\n */\nexport function wilsonScore(wins: number, played: number): [number, number, number] {\n  if (played === 0) return [0, 0, 0];\n  const p = wins / played;\n  const z = 1.96;\n  const z2 = z * z;\n  const den = 1 + z2 / played;\n  const center = (p + z2 / (2 * played)) / den;\n  const half = (z * Math.sqrt((p * (1 - p) + z2 / (4 * played)) / played)) / den;\n  return [center, Math.max(0, center - half), Math.min(1, center + half)];\n}\n'
    open('src/lib/stats.ts', 'w', encoding='utf-8').write(text)

text2 = open('src/components/Matrix.tsx', 'r', encoding='utf-8').read()
if 'wilsonScore' not in text2:
    text2 = text2.replace('import { clamp } from "@/lib/format";', 'import { clamp } from "@/lib/format";\nimport { wilsonScore } from "@/lib/stats";')
    text2 = re.sub(r'const alpha = clamp\(.*?\);', 'const alpha = clamp(0.16 + v.n * 0.1, 0.16, 0.85);\n                  const [wCenter] = wilsonScore(v.wins, v.n);\n                  const displayRate = v.n >= 10 ? v.winRate : wCenter;', text2)
    text2 = text2.replace('v.winRate >= 0.55', 'displayRate >= 0.55').replace('v.winRate <= 0.45', 'displayRate <= 0.45')
    text2 = text2.replace('Math.round(v.winRate * 100)', 'Math.round(displayRate * 100)')
    open('src/components/Matrix.tsx', 'w', encoding='utf-8').write(text2)
