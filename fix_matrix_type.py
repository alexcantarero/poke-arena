import re
text = open('src/lib/stats.ts', 'r', encoding='utf-8').read()
text = text.replace('cell: (rowId: string, colId: string) => { n: number; winRate: number } | null;', 'cell: (rowId: string, colId: string) => { n: number; winRate: number; wins: number } | null;')
text = text.replace('return { n: c.n, winRate: (c.w + c.d * 0.5) / c.n };', 'return { n: c.n, wins: c.w, winRate: (c.w + c.d * 0.5) / c.n };')
open('src/lib/stats.ts', 'w', encoding='utf-8').write(text)
