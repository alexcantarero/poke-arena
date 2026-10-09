import re
text = open('src/app/(app)/estadisticas/page.tsx', 'r', encoding='utf-8').read()
text = text.replace('gameWins: 0,\n          gameLosses: 0,\n          winRate:', 'gameWins: 0,\n          gameLosses: 0,\n          firstPlayed: 0, firstWins: 0, secondPlayed: 0, secondWins: 0,\n          winRate:')

rep2 = r'''                </p>
                {focusRow.firstPlayed > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    Empezando: {focusRow.firstWins}V {focusRow.firstPlayed - focusRow.firstWins}D ({pct(focusRow.firstWins / focusRow.firstPlayed, 0)}) · Segundo: {focusRow.secondWins}V {focusRow.secondPlayed - focusRow.secondWins}D ({pct(focusRow.secondWins / focusRow.secondPlayed, 0)})
                  </p>
                )}
              </div>'''

text = re.sub(r'\s*</p>\s*</div>', '\n' + rep2, text, count=1)
open('src/app/(app)/estadisticas/page.tsx', 'w', encoding='utf-8').write(text)
