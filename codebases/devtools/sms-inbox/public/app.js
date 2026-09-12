"use strict";
const form = document.querySelector("#filters");
const list = document.querySelector("#messages");
const status = document.querySelector("#status");
const older = document.querySelector("#older");
let cursor = null;
let generation = 0;
async function load(append = false) {
  const current = ++generation;
  status.textContent = "Chargement…";
  older.disabled = true;
  const query = new URLSearchParams({ limit: "30" });
  for (const [id, name] of [["recipient", "toE164"], ["category", "category"], ["correlation", "correlationId"]]) {
    const value = document.getElementById(id).value.trim(); if (value) query.set(name, value);
  }
  if (append && cursor) query.set("cursor", String(cursor));
  try {
    const response = await fetch(`/messages?${query}`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Lecture impossible : vérifiez les filtres et réessayez.");
    const data = await response.json();
    if (current !== generation) return;
    if (!append) list.replaceChildren();
    for (const message of data.items) {
      const item = document.createElement("article");
      const title = document.createElement("h2"); title.textContent = `${message.toE164} · ${message.category}`;
      const meta = document.createElement("p"); meta.className = "meta";
      meta.textContent = `${new Date(message.receivedAt).toLocaleString("fr-FR")} · ${message.encoding}, ${message.segments} segment(s) estimé(s) · ${message.state}`;
      const text = document.createElement("pre"); text.textContent = message.text;
      const reference = document.createElement("p"); reference.className = "meta";
      reference.textContent = `Réf. ${message.id} · corrélation ${message.delivery.correlationId}`;
      item.append(title, meta, text, reference); list.append(item);
    }
    cursor = data.nextCursor; older.hidden = !cursor;
    status.textContent = list.children.length ? `${list.children.length} message(s) affiché(s).` : "Aucun message pour ces filtres.";
  } catch (error) { if (current === generation) status.textContent = error instanceof Error ? error.message : "Boîte indisponible."; }
  finally { if (current === generation) older.disabled = false; }
}
form.addEventListener("submit", (event) => { event.preventDefault(); void load(); });
older.addEventListener("click", () => void load(true));
void load();
