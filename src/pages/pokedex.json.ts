import type { APIRoute } from "astro";
import { TYPES } from "../scripts/pokemon/types";
import { MAX_DEX } from "../scripts/pokemon/api";

// Built once at deploy time so the Pokédex can filter all Pokémon instantly
// instead of making hundreds of PokéAPI requests in the visitor's browser.

const API = "https://pokeapi.co/api/v2";

// Last national dex number of each generation.
const GEN_ENDS = [151, 251, 386, 493, 649, 721, 809, 905, 1025];

const idFromUrl = (url: string) => Number(url.split("/").filter(Boolean).pop());

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokéAPI ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export const GET: APIRoute = async () => {
  const [list, ...typeData] = await Promise.all([
    getJson<{ results: { name: string; url: string }[] }>(`${API}/pokemon?limit=${MAX_DEX}`),
    ...TYPES.map((t) =>
      getJson<{ pokemon: { slot: number; pokemon: { url: string } }[] }>(`${API}/type/${t}`),
    ),
  ]);

  const typesById = new Map<number, [number, string][]>();
  typeData.forEach((data, i) => {
    for (const entry of data.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      if (id > MAX_DEX) continue;
      const slots = typesById.get(id) ?? [];
      slots.push([entry.slot, TYPES[i]]);
      typesById.set(id, slots);
    }
  });

  const dex = list.results.map((r) => {
    const id = idFromUrl(r.url);
    return {
      id,
      name: r.name,
      gen: GEN_ENDS.findIndex((end) => id <= end) + 1,
      types: (typesById.get(id) ?? []).sort((a, b) => a[0] - b[0]).map(([, t]) => t),
    };
  });

  return new Response(JSON.stringify(dex), { headers: { "Content-Type": "application/json" } });
};
