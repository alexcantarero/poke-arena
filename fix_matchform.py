import re
text = open('src/components/MatchForm.tsx', 'r', encoding='utf-8').read()

rep_props = '''  canPickPlayer?: boolean;
  initialP1?: string;
  initialP2?: string;
  initialBestOf?: number;
  initialGames?: Array<{ winner: string; first: string; archA: string; archB: string }>;
};'''
text = text.replace('  canPickPlayer?: boolean;\n};', rep_props)

rep_dest = '''  match, players, decks, archetypes, competitions, tournaments, meId, canPickPlayer = false,
  initialP1, initialP2, initialBestOf, initialGames
}: Props) {
  const active = players.filter((p) => p.active || match);
  const [aId, setAId] = useState(match?.playerAId ?? initialP1 ?? meId ?? active[0]?.id ?? "");
  const [external, setExternal] = useState(Boolean(match && !match.playerBId));
  const [bId, setBId] = useState(match?.playerBId ?? initialP2 ?? active.find((p) => p.id !== (meId ?? active[0]?.id))?.id ?? "");'''
text = re.sub(r'  match, players, decks, archetypes, competitions, tournaments, meId, canPickPlayer = false,\n\}: Props\) \{\n  const active = players\.filter\(\(p\) => p\.active \|\| match\);\n  const \[aId, setAId\] = useState\(match\?\.playerAId \?\? meId \?\? active\[0\]\?\.id \?\? ""\);\n  const \[external, setExternal\] = useState\(Boolean\(match && !match\.playerBId\)\);\n  const \[bId, setBId\] = useState\(match\?\.playerBId \?\? active\.find\(\(p\) => p\.id !== \(meId \?\? active\[0\]\?\.id\)\)\?\.id \?\? ""\);', rep_dest, text)

rep_bo = '''  const [oppArch, setOppArch] = useState(match?.opponentArchetypeId ?? "");
  const [bestOf, setBestOf] = useState(match?.bestOf ?? initialBestOf ?? 3);
  // v0.25: cada juego lleva adem'''
text = re.sub(r'  const \[oppArch, setOppArch\] = useState\(match\?\.opponentArchetypeId \?\? ""\);\n  const \[bestOf, setBestOf\] = useState\(match\?\.bestOf \?\? 3\);\n  // v0\.25: cada juego lleva adem', rep_bo, text)

rep_games = '''  const [games, setGames] = useState<Array<{ winner: string; first: string; archA: string; archB: string }>>(() => {
    const base = Array.from({ length: 5 }, () => ({ winner: "", first: "", archA: "", archB: "" }));
    if (match) {
      match.games.forEach((g, i) => {
        if (i < 5) base[i] = { winner: g.winner, first: g.first, archA: g.archetypeAId ?? "", archB: g.archetypeBId ?? "" };
      });
    } else if (initialGames) {
      initialGames.forEach((g, i) => {
        if (i < 5) base[i] = g;
      });
    }
    return base;
  });'''
text = re.sub(r'  const \[games, setGames\] = useState<Array<\{ winner: string; first: string; archA: string; archB: string \}>>\(\(\) => \{\n    const base = Array\.from\(\{ length: 5 \}, \(\) => \(\{ winner: "", first: "", archA: "", archB: "" \}\)\);\n    match\?\.games\.forEach\(\(g, i\) => \{\n      if \(i < 5\) base\[i\] = \{ winner: g\.winner, first: g\.first, archA: g\.archetypeAId \?\? "", archB: g\.archetypeBId \?\? "" \};\n    \}\);\n    return base;\n  \}\);', rep_games, text)

open('src/components/MatchForm.tsx', 'w', encoding='utf-8').write(text)
