import re
text = open('src/components/statistics/LadderChart.tsx', 'r', encoding='utf-8').read()
text = text.replace('{p.payload.matchId && <div className="mt-0.5 opacity-60 font-mono text-[9px]">{p.payload.matchId.split(\'-\')[0]}</div>}', '{p.payload.matchId && <div className="mt-0.5 opacity-60 font-mono text-[9px]">ID: {p.payload.matchId}</div>}')
text = text.replace('const title = porOrden ? `Partida ${Math.round(t)} · ${etiquetaX(t)}` : fecha(t);', 'const title = etiquetaX(t);')
open('src/components/statistics/LadderChart.tsx', 'w', encoding='utf-8').write(text)

text2 = open('src/components/charts.tsx', 'r', encoding='utf-8').read()
text2 = text2.replace('{p.matchId && <div className="mt-0.5 opacity-60 font-mono text-[9px]">{p.matchId.split(\'-\')[0]}</div>}', '{p.matchId && <div className="mt-0.5 opacity-60 font-mono text-[9px]">ID: {p.matchId}</div>}')
open('src/components/charts.tsx', 'w', encoding='utf-8').write(text2)
