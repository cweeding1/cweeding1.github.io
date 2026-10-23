import { displayName } from "./api";

export interface DexEntry {
  id: number;
  name: string;
  gen: number;
  types: string[];
}

export interface PartyMember {
  name: string;
  front: string;
}

interface Options {
  getParty: () => PartyMember[];
  add: (name: string) => Promise<boolean>;
  remove: (index: number) => void;
}

export const spriteUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

// Wires up the Pokédex dialog. Returns a refresh function to call whenever
// the party changes outside the dialog.
export function setupPokedex(dialog: HTMLDialogElement, opts: Options) {
  const $ = <T extends Element = HTMLElement>(sel: string) => dialog.querySelector<T>(sel)!;
  const grid = $(".dex-grid");
  const status = $(".dex-status");
  const nameInput = $<HTMLInputElement>("#dex-name");
  const genSelect = $<HTMLSelectElement>("#dex-gen");
  const chips = [...dialog.querySelectorAll<HTMLButtonElement>(".type-chip")];

  let entries: DexEntry[] = [];
  const tiles = new Map<string, HTMLButtonElement>();
  let type = "";
  let loading: Promise<void> | null = null;
  let pending = false;

  function load() {
    loading ??= fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/pokedex.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<DexEntry[]>;
      })
      .then((data) => {
        entries = data;
        renderGrid();
        applyFilters();
      })
      .catch(() => {
        loading = null;
        status.textContent = "Couldn't load the Pokédex. Close and try again.";
      });
    return loading;
  }

  function renderGrid() {
    grid.replaceChildren(
      ...entries.map((e) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.name = e.name;
        btn.title = `Add ${displayName(e.name)}`;
        btn.innerHTML = `
          <img src="${spriteUrl(e.id)}" alt="" loading="lazy" width="80" height="80">
          <span class="dex-num">#${String(e.id).padStart(4, "0")}</span>
          <span class="dex-name">${displayName(e.name)}</span>
          <span class="dex-tys">${e.types.map((t) => `<span class="type type-${t}">${t}</span>`).join("")}</span>`;
        btn.addEventListener("click", () => pick(e.name));
        tiles.set(e.name, btn);
        return btn;
      }),
    );
    refresh();
  }

  async function pick(name: string) {
    if (pending) return;
    pending = true;
    status.textContent = `Adding ${displayName(name)}...`;
    const ok = await opts.add(name);
    pending = false;
    if (!ok) status.textContent = `Couldn't add ${displayName(name)}. Try again.`;
    else applyFilters();
  }

  function applyFilters() {
    const q = nameInput.value.trim().toLowerCase().replace(/\s+/g, "-");
    const gen = Number(genSelect.value) || 0;
    let shown = 0;
    for (const e of entries) {
      const match =
        (!q || e.name.includes(q) || String(e.id) === q) &&
        (!gen || e.gen === gen) &&
        (!type || e.types.includes(type));
      tiles.get(e.name)!.hidden = !match;
      if (match) shown++;
    }
    if (!entries.length) return;
    const full = opts.getParty().length >= 6;
    status.textContent = full
      ? "Party is full. Tap a party slot to remove a Pokémon."
      : `${shown} Pokémon found. Tap one to add it to your party.`;
  }

  // Sync the party strip and the "in party" markers with the current team.
  function refresh() {
    const party = opts.getParty();
    const names = new Set(party.map((p) => p.name));
    const full = party.length >= 6;

    $(".dex-count").textContent = `${party.length}/6`;
    $(".dex-slots").replaceChildren(
      ...Array.from({ length: 6 }, (_, i) => {
        const li = document.createElement("li");
        const mon = party[i];
        if (!mon) return li;
        li.className = "filled";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = `Remove ${displayName(mon.name)}`;
        btn.setAttribute("aria-label", `Remove ${displayName(mon.name)}`);
        btn.innerHTML = `<img src="${mon.front}" alt="">`;
        btn.addEventListener("click", () => {
          opts.remove(i);
          applyFilters();
        });
        li.append(btn);
        return li;
      }),
    );

    for (const [name, tile] of tiles) {
      const picked = names.has(name);
      tile.classList.toggle("picked", picked);
      tile.disabled = picked || full;
    }
  }

  nameInput.addEventListener("input", applyFilters);
  genSelect.addEventListener("change", applyFilters);
  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      type = chip.dataset.type ?? "";
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      applyFilters();
    }),
  );

  dialog.querySelectorAll("[data-dex=close]").forEach((b) => b.addEventListener("click", () => dialog.close()));
  // Clicking the dimmed backdrop closes the dialog.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  return {
    open() {
      dialog.showModal();
      refresh();
      load();
      nameInput.focus();
    },
    refresh,
  };
}
