import re
text = open('src/app/(app)/partidas/nueva/page.tsx', 'r', encoding='utf-8').read()

rep = '''export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  
  const p1 = typeof q.p1 === "string" ? q.p1 : undefined;
  const p2 = typeof q.p2 === "string" ? q.p2 : undefined;
  const w1 = typeof q.w1 === "string" ? parseInt(q.w1) : undefined;
  const w2 = typeof q.w2 === "string" ? parseInt(q.w2) : undefined;
  const bo = typeof q.bo === "string" ? parseInt(q.bo) : undefined;
  
  let initialGames: any = undefined;
  if (w1 !== undefined && w2 !== undefined) {
    initialGames = [];
    for (let i = 0; i < w1; i++) initialGames.push({ winner: "a", first: "", archA: "", archB: "" });
    for (let i = 0; i < w2; i++) initialGames.push({ winner: "b", first: "", archA: "", archB: "" });
  }'''

text = text.replace('export default async function NewMatchPage() {\n  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);', rep)
text = text.replace('canPickPlayer={me ? canManageLeague(me.role) : false}', 'canPickPlayer={me ? canManageLeague(me.role) : false}\n        initialP1={p1}\n        initialP2={p2}\n        initialBestOf={bo}\n        initialGames={initialGames}')

open('src/app/(app)/partidas/nueva/page.tsx', 'w', encoding='utf-8').write(text)
