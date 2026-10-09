import re
text = open('src/lib/stats.ts', 'r', encoding='utf-8').read()
text = text.replace('gameWins: number; gameLosses: number;', 'gameWins: number; gameLosses: number;\n    firstPlayed: number; firstWins: number;\n    secondPlayed: number; secondWins: number;')
text = text.replace('gameWins: 0, gameLosses: 0, winRate: null', 'gameWins: 0, gameLosses: 0, winRate: null, firstPlayed: 0, firstWins: 0, secondPlayed: 0, secondWins: 0')

replacement = '''      for (const [side, pid, arch, gf, ga] of sides) {
        if (!arch) continue;
        if (onlyPlayerId && pid !== onlyPlayerId) continue;
        const r = touch(arch);
        r.played++; r.gameWins += gf; r.gameLosses += ga;
        if (o.winner === "tie") r.ties++;
        else if (o.winner === side) r.wins++;
        else r.losses++;

        for (const g of m.games) {
          if (!g.first || !g.winner || g.winner === "tie") continue;
          if (g.first === side) {
            r.firstPlayed++;
            if (g.winner === side) r.firstWins++;
          } else {
            r.secondPlayed++;
            if (g.winner === side) r.secondWins++;
          }
        }
      }'''

text = re.sub(r'      for \(const \[side, pid, arch, gf, ga\] of sides\) \{.*?\n      \}', replacement, text, flags=re.DOTALL)
open('src/lib/stats.ts', 'w', encoding='utf-8').write(text)
