import re
text = open('src/components/statistics/LadderChart.tsx', 'r', encoding='utf-8').read()
text = re.sub(r'                            \{p\.payload\.matchId && <div className="mt-0\.5 opacity-60 font-mono text-\[9px\]">ID: \{p\.payload\.matchId\}</div>\}\n', '', text)
open('src/components/statistics/LadderChart.tsx', 'w', encoding='utf-8').write(text)
