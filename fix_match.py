import re
text = open('src/app/(app)/partidas/[id]/page.tsx', 'r', encoding='utf-8').read()
text = text.replace('const nameB = B?.name ?? match.opponentName ?? "el rival";', 'const nameB = B?.name ?? match.opponentName ?? "el rival";\n\n  const eloHistoryA = snap.elo.history[match.playerAId]?.find((h) => h.matchId === match.id);\n  const deltaA = eloHistoryA?.delta ? Math.round(eloHistoryA.delta) : null;\n  const eloHistoryB = match.playerBId ? snap.elo.history[match.playerBId]?.find((h) => h.matchId === match.id) : null;\n  const deltaB = eloHistoryB?.delta ? Math.round(eloHistoryB.delta) : null;')
text = text.replace('{ p: A, arch: archA, name: A?.name, win: o.winner === "a" },', '{ p: A, arch: archA, name: A?.name, win: o.winner === "a", delta: deltaA },')
text = text.replace('{ p: B, arch: archB, name: B?.name ?? match.opponentName, win: o.winner === "b" },', '{ p: B, arch: archB, name: B?.name ?? match.opponentName, win: o.winner === "b", delta: deltaB },')

rep1 = '                  </span>\n                )}\n              </div>'
rep2 = '                  </span>\n                )}\n                {s.delta != null && (\n                  <span className={`mt-0.5 text-xs font-bold ${s.delta > 0 ? "text-win" : s.delta < 0 ? "text-loss" : "text-muted"}`}>\n                    {s.delta > 0 ? "+" : ""}{s.delta} Elo\n                  </span>\n                )}\n              </div>'
text = text.replace(rep1, rep2)

text = text.replace('sub={`${fmtDateLong(match.date)}', 'sub={`ID: ${match.id} · ${fmtDateLong(match.date)}')
open('src/app/(app)/partidas/[id]/page.tsx', 'w', encoding='utf-8').write(text)
