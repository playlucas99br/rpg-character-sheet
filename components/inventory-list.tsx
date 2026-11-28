"use client";

import type { ReactNode } from "react";
import type { InventoryItem } from "../lib/game/types";
import { formatInventoryWeight, inventoryWeight } from "../lib/game/inventory";

export function InventoryList({
  items,
  renderCounterControls,
}: {
  items: readonly InventoryItem[];
  renderCounterControls?: (item: InventoryItem) => ReactNode;
}) {
  return (
    <div className="inventory-list">
      <div className="inventory-summary">
        <span>{items.length} {items.length === 1 ? "item organizado" : "itens organizados"}</span>
        <strong>Peso total: {formatInventoryWeight(inventoryWeight(items))} kg</strong>
      </div>
      {!items.length && <p className="small muted">Adicione itens para acompanhar quantidade, peso e equipamento.</p>}
      {!!items.length && (
        <ul className="inventory-items">
          {items.map((item) => {
            const controls = renderCounterControls?.(item);
            return (
              <li className="inventory-item-card" key={item.id}>
                <div className="inventory-item-heading">
                  <strong>{item.name}</strong>
                  <span className={`inventory-item-state${item.equipped ? " is-equipped" : ""}`}>
                    {item.equipped ? "Equipado" : "Guardado"}
                  </span>
                </div>
                <dl className="inventory-item-details">
                  <div><dt>Quantidade</dt><dd>{item.quantity}</dd></div>
                  <div><dt>Peso unitário</dt><dd>{formatInventoryWeight(item.weight)} kg</dd></div>
                  <div><dt>Peso total</dt><dd>{formatInventoryWeight(inventoryWeight([item]))} kg</dd></div>
                </dl>
                {item.description && <p className="preserve-lines inventory-item-description">{item.description}</p>}
                {controls && <div className="inventory-item-controls">{controls}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
