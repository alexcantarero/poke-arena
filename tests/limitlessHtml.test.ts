import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeHtml, filasParaGuardar, nombreDeSprites, parseCabezaResultados, parseCityLeague,
  parseEstadisticas, parseListaCityLeagues, parseListaTorneos, tipoDeTorneo,
} from "../src/lib/limitlessHtml.ts";

/* Fragmentos copiados del HTML real de limitlesstcg.com el 28/09/2026. */

const LISTA = `<table class="data-table striped completed-tournaments">
    <tr><th>Date</th></tr>
                    <tr data-date="2026-09-26" data-country="DE"
            data-name="Regional Frankfurt" data-format="standard"
            data-players="2793" data-winner="PL-Tomasz Chałupka">
            <td>26 Sep 26</td>
            <td><a href="/tournaments/579">Regional Frankfurt</a></td>
            <td class="winner landscape-only"><a class="inline" href="/players/7366">Tomasz Chałupka</a></td>
        </tr>
                    <tr data-date="2026-09-20" data-country="JP"
            data-name="Champions League Yokohama" data-format="standard"
            data-players="5000" data-winner="JP-X">
            <td><a href="/tournaments/569">Champions League Yokohama</a></td>
        </tr></table>`;

const STATS = `<table class="data-table striped">
        <tr><th>#</th></tr>
                            <tr data-count="203" data-points="952">
                <td>1</td>
                <td><img class="pokemon" src="https://r2.limitlesstcg.net/pokemon/gen9/dragapult.png" alt="dragapult"></td>
                <td><a href="/decks/284">Dragapult</a></td>
                <td><span class="tt-tip" data-tooltip="131 Dragapult">203</span></td>
            </tr>
                    <tr data-count="46" data-points="312">
                <td>2</td>
                <td><img class="pokemon" src="x/ogerpon.png" alt="ogerpon"><img class="pokemon" src="x/clefairy.png" alt="clefairy"></td>
                <td><a href="/decks/339">Basic Box</a></td>
            </tr>
                    <tr data-count="45" data-points="226">
                <td>3</td>
                <td><img class="pokemon" src="x/zoroark.png" alt="zoroark"></td>
                <td><a href="/decks/320">N&#039;s Zoroark</a></td>
            </tr></table>`;

const RESULTADOS = `<table class="data-table striped">
                    <tr data-rank="1" data-name="Dylan Kasturi" data-country="US" data-deck="Basic Box" >
                <td>1</td>
                <td><a href="/players/8258">Dylan Kasturi</a></td>
                <td><a href="/decks/339"><span data-tooltip="Basic Box"><img class="pokemon" src="x" alt="ogerpon"><img class="pokemon" src="x" alt="clefairy"></span></a></td>
            </tr>
                    <tr data-rank="2" data-name="Ben Dobberstein" data-country="US" data-deck="Hydrapple" >
                <td>2</td>
                <td><a href="/players/2044">Ben Dobberstein</a></td>
                <td><a href="/decks/352"><span data-tooltip="Hydrapple"><img class="pokemon" src="x" alt="hydrapple"></span></a></td>
            </tr>
                    <tr data-rank="3" data-name="Rohit Potti" data-country="US" data-deck="Dragapult" >
                <td>3</td><td><a href="/players/1">Rohit Potti</a></td>
                <td><a href="/decks/284"><span><img class="pokemon" src="x" alt="dragapult"></span></a></td>
            </tr></table>`;

const CL_LISTA = `<table class="data-table striped completed-tournaments">
            <tr data-date="2026-09-28" data-city="Miyagi" data-shop="シーガル　仙台駅前店" data-winner="toxtricity munkidori">
            <td><a href="https://limitlesstcg.com/tournaments/jp/4830">28 Sep 26</a></td>
        </tr></table>`;

const CL = `<table class="data-table striped">
    <tr><th>#</th><th>Player</th><th>Deck</th><th>List</th></tr>
            <tr>
            <td>1</td>
            <td><a href="/players/jp/0078488331">ヨリトモ</a></td>
            <td>
                                    <a href="https://limitlesstcg.com/decks/list/jp/72111"><span><img class="pokemon" src="x" alt="toxtricity"><img class="pokemon" src="x" alt="munkidori"></span></a>
                            </td>
        </tr>
            <tr>
            <td>2</td>
            <td><a href="/players/jp/0100889972">おにく！</a></td>
            <td><a href="https://limitlesstcg.com/decks/list/jp/72112"><span><img class="pokemon" src="x" alt="dragapult"><img class="pokemon" src="x" alt="dudunsparce"></span></a></td>
        </tr></table>`;

test("parseListaTorneos: id, fecha, nombre, asistencia; sin ganador", () => {
  const l = parseListaTorneos(LISTA);
  assert.equal(l.length, 2);
  assert.deepEqual(l[0], { id: "579", date: "2026-09-26", name: "Regional Frankfurt", country: "DE", format: "standard", players: 2793 });
  assert.ok(!JSON.stringify(l).includes("Chałupka"), "el ganador no se lee");
});

test("tipoDeTorneo: solo los del circuito", () => {
  assert.equal(tipoDeTorneo("Regional Frankfurt"), "regional");
  assert.equal(tipoDeTorneo("Europe International Championship"), "international");
  assert.equal(tipoDeTorneo("Champions League Yokohama"), null);
});

test("parseEstadisticas: nombre, sprites y recuento, con entidades deshechas", () => {
  const s = parseEstadisticas(STATS);
  assert.equal(s.length, 3);
  assert.deepEqual(s[0], { name: "Dragapult", main: "dragapult", secondary: "", count: 203 });
  assert.deepEqual(s[1], { name: "Basic Box", main: "ogerpon", secondary: "clefairy", count: 46 });
  assert.equal(s[2].name, "N's Zoroark");
});

test("parseCabezaResultados: puesto y mazo, NUNCA el jugador", () => {
  const c = parseCabezaResultados(RESULTADOS, 2);
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { placement: 1, name: "Basic Box", main: "ogerpon", secondary: "clefairy" });
  const txt = JSON.stringify(parseCabezaResultados(RESULTADOS, 16));
  for (const n of ["Dylan", "Kasturi", "Dobberstein", "Potti"]) assert.ok(!txt.includes(n), n);
});

test("City Leagues: lista y puestos con el mazo sacado de los sprites", () => {
  assert.deepEqual(parseListaCityLeagues(CL_LISTA), [{ id: "4830", date: "2026-09-28", prefecture: "Miyagi" }]);
  const p = parseCityLeague(CL);
  assert.deepEqual(p[0], { placement: 1, name: "Toxtricity Munkidori", main: "toxtricity", secondary: "munkidori" });
  assert.equal(p[1].name, "Dragapult Dudunsparce");
  assert.ok(!JSON.stringify(p).includes("ヨリトモ"));
});

test("filasParaGuardar: el top cut no se cuenta dos veces", () => {
  const f = filasParaGuardar(parseEstadisticas(STATS), parseCabezaResultados(RESULTADOS, 3));
  const total = f.reduce((a, r) => a + r.copies, 0);
  // Hydrapple está en el corte pero no en el fragmento de estadísticas: suma una.
  assert.equal(total, 203 + 46 + 45 + 1);
  assert.equal(f.find((r) => r.placement == null && r.name === "Dragapult")!.copies, 202);
  assert.equal(f.filter((r) => r.placement != null).length, 3);
});

test("utilidades", () => {
  assert.equal(decodeHtml("N&#039;s &amp; Co"), "N's & Co");
  assert.equal(nombreDeSprites(["excadrill-mega"]), "Excadrill Mega");
});
