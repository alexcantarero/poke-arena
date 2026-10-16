"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "@/actions";
import type { Archetype, PublicPlayer } from "@/lib/types";
import { pokeSlug, prettyPokemon, spriteUrl } from "@/lib/pokemon";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

const COLORS = ["#f0b429", "#4aa8e8", "#63bd5a", "#e987b8", "#b271c9", "#f0803c", "#9aa6b4", "#c8a94a", "#5c9ea8", "#d4675f"];

/** Sugerencias para el avatar. Vale cualquier Pokémon: esto es solo un atajo. */
const SUGGESTED = [
  "pikachu", "charizard", "gengar", "snorlax", "eevee", "lucario", "greninja",
  "dragapult", "gardevoir", "mimikyu", "tyranitar", "sylveon", "garchomp", "umbreon",
  "raging-bolt", "ogerpon", "zoroark", "slowking", "alakazam", "excadrill-mega",
];

export function ProfileForm({ player, archetypes }: { player: PublicPlayer; archetypes: Archetype[] }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [state, action, pending] = useActionState(saveProfile, null);
  const [color, setColor] = useState(player.color);
  const [avatarKind, setAvatarKind] = useState(player.avatarKind);
  const [avatarValue, setAvatarValue] = useState(player.avatarValue);

  const slug = pokeSlug(avatarValue);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={player.id} />

      <section className="card p-4">
        <h2 className="mb-4 text-lg font-bold">{tr(lng, "x.11f1921c")}</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="name">{tr(lng, "x.e68491e9")}</label>
            <input className="input" id="name" name="name" required maxLength={40} defaultValue={player.name} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="bio">{tr(lng, "x.76ba03ca")}</label>
            <input
              className="input" id="bio" name="bio" maxLength={140} defaultValue={player.bio}
              placeholder={tr(lng, "x.3937d205")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="favoriteArchetypeId">{tr(lng, "x.e18c3c91")}</label>
            <select className="input" id="favoriteArchetypeId" name="favoriteArchetypeId" defaultValue={player.favoriteArchetypeId ?? ""}>
              <option value="">{tr(lng, "x.8a4e4db7")}</option>
              {archetypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="playerTag">{tr(lng, "x.44e6c1db")}</label>
            <input
              className="input" id="playerTag" name="playerTag" maxLength={60}
              defaultValue={player.playerTag ?? ""} placeholder={tr(lng, "x.9b58cdec")}
            />
            <p className="text-xs text-muted">{tr(lng, "x.40b86917")}</p>
          </div>

          {/* v0.36 — con esto la app puede buscarte en las clasificaciones de
              Limitless y traerse tus torneos online ya rellenos. */}
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="limitlessHandle">{tr(lng, "x.489518db")}</label>
            <input
              className="input" id="limitlessHandle" name="limitlessHandle" maxLength={60}
              defaultValue={player.limitlessHandle ?? ""} placeholder={tr(lng, "x.cd862552")}
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
            />
            <p className="text-xs text-muted">
              {tr(lng, "x.554c3968")}
            </p>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-lg font-bold">{tr(lng, "x.5714348c")}</h2>
        <p className="mb-4 text-sm text-muted">{tr(lng, "x.f5ab68ee")}</p>

        <div className="seg mb-4 w-full">
          {([["none", "Inicial"], ["pokemon", "Pokémon"], ["image", "Imagen"]] as const).map(([v, l]) => (
            <button key={v} type="button" data-on={avatarKind === v} onClick={() => setAvatarKind(v)}>{l}</button>
          ))}
        </div>
        <input type="hidden" name="avatarKind" value={avatarKind} />

        <div className="flex items-start gap-4">
          <span
            className="grid size-16 flex-none place-items-center overflow-hidden rounded-full font-display text-2xl font-extrabold text-[#0d1424]"
            style={{ background: color }}
          >
            {avatarKind === "pokemon" && slug
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={spriteUrl(slug)} alt="" className="size-full scale-110 object-contain" />
              : avatarKind === "image" && avatarValue
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarValue} alt="" className="size-full object-cover" />
              : player.name.slice(0, 1).toUpperCase()}
          </span>

          <div className="min-w-0 flex-1">
            {avatarKind === "pokemon" && (
              <>
                <input
                  className="input" name="avatarValue" value={avatarValue}
                  onChange={(e) => setAvatarValue(e.target.value)}
                  placeholder={tr(lng, "x.e4409822")} list="poke-suggestions" autoCapitalize="none" spellCheck={false}
                />
                <datalist id="poke-suggestions">
                  {SUGGESTED.map((s) => <option key={s} value={s}>{prettyPokemon(s)}</option>)}
                </datalist>
                <div className="mt-2 flex flex-wrap gap-1">
                  {SUGGESTED.slice(0, 10).map((s) => (
                    <button
                      key={s} type="button" onClick={() => setAvatarValue(s)}
                      className="rounded-lg border border-line p-0.5 hover:bg-surface-2"
                      title={prettyPokemon(s)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={spriteUrl(s)} alt={prettyPokemon(s)} className="size-8" loading="lazy" />
                    </button>
                  ))}
                </div>
              </>
            )}
            {avatarKind === "image" && (
              <input
                className="input" name="avatarValue" type="url" inputMode="url" value={avatarValue}
                onChange={(e) => setAvatarValue(e.target.value)}
                placeholder={tr(lng, "x.a8d81a67")}
              />
            )}
            {avatarKind === "none" && (
              <>
                <input type="hidden" name="avatarValue" value="" />
                <p className="text-sm text-muted">{tr(lng, "x.e44c5008")}</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label className="label">{tr(lng, "x.ae82f496")}</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c} type="button" onClick={() => setColor(c)}
                aria-label={`Color ${c}`} aria-pressed={color === c}
                className={`size-9 rounded-full border-2 ${color === c ? "border-ink" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <input type="hidden" name="color" value={color} />
          <p className="text-xs text-muted">{tr(lng, "x.404d7cd8")}</p>
        </div>
      </section>

      {state?.error && <p role="alert" className="rounded-lg bg-loss-soft px-3 py-2 text-sm font-medium text-loss">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-win-soft px-3 py-2 text-sm font-medium text-win">{state.ok}</p>}

      <button className="btn btn-brand w-full" type="submit" disabled={pending}>
        {pending ? "Guardando…" : tr(lng, "x.da7f0ab4")}
      </button>
    </form>
  );
}
