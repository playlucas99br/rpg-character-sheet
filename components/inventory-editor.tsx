"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InventoryItem } from "../lib/game/types";
import { randomId } from "../lib/game/id";
import {
  formatInventoryWeight,
  inventoryWeight,
  MAX_INVENTORY_ITEMS,
  MAX_ITEM_QUANTITY,
  MAX_ITEM_WEIGHT,
} from "../lib/game/inventory";
import { Button, Field } from "./ui";

export function InventoryEditor({
  items,
  onChange,
  renderCounterEditor,
}: {
  items: InventoryItem[];
  onChange: (items: InventoryItem[]) => void;
  renderCounterEditor?: (item: InventoryItem, onChangeItem: (item: InventoryItem) => void) => ReactNode;
}) {
  function updateItem(index: number, item: InventoryItem) {
    onChange(items.map((previous, itemIndex) => itemIndex === index ? item : previous));
  }

  return (
    <div className="inventory-editor">
      <div className="inventory-summary">
        <strong>Itens organizados</strong>
        <span>Peso total: {formatInventoryWeight(inventoryWeight(items))} kg</span>
      </div>
      <p className="small muted">
        Informe o peso de uma unidade em kg. O total considera a quantidade de cada item.
        As anotações de equipamento continuam disponíveis abaixo.
      </p>
      {items.map((item, index) => (
        <div
          className="repeatable-field inventory-item-editor"
          key={item.id}
          role="group"
          aria-label={`Item ${index + 1}: ${item.name || "sem nome"}`}
        >
          <div className="repeatable-heading">
            <strong>Item {index + 1}</strong>
            <button
              type="button"
              className="icon-button danger-text"
              aria-label={`Remover item ${item.name || index + 1}`}
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 size={18} />
            </button>
          </div>
          <Field label="Nome do item">
            <input
              value={item.name}
              required
              maxLength={100}
              onChange={(event) => updateItem(index, { ...item, name: event.target.value })}
            />
          </Field>
          <div className="form-grid inventory-item-numbers">
            <Field label="Quantidade">
              <input
                type="number"
                min={0}
                max={MAX_ITEM_QUANTITY}
                step={1}
                required
                value={item.quantity}
                onChange={(event) => updateItem(index, { ...item, quantity: Number(event.target.value) })}
              />
            </Field>
            <Field label="Peso unitário (kg)">
              <input
                type="number"
                min={0}
                max={MAX_ITEM_WEIGHT}
                step={0.001}
                required
                value={item.weight}
                onChange={(event) => updateItem(index, { ...item, weight: Number(event.target.value) })}
              />
            </Field>
          </div>
          <label className="inventory-equipped-input">
            <input
              type="checkbox"
              checked={item.equipped}
              onChange={(event) => updateItem(index, { ...item, equipped: event.target.checked })}
            />
            <span>Equipado</span>
          </label>
          <Field label="Descrição do item (opcional)">
            <textarea
              rows={2}
              maxLength={2000}
              value={item.description ?? ""}
              onChange={(event) => updateItem(index, { ...item, description: event.target.value })}
            />
          </Field>
          {renderCounterEditor?.(item, (next) => updateItem(index, next))}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={items.length >= MAX_INVENTORY_ITEMS}
        onClick={() => onChange([...items, {
          id: randomId(),
          name: "Novo item",
          quantity: 1,
          weight: 0,
          equipped: false,
          description: "",
        }])}
      >
        <Plus size={16} />
        Adicionar item
      </Button>
      {items.length >= MAX_INVENTORY_ITEMS && (
        <p className="small muted">Limite de {MAX_INVENTORY_ITEMS} itens por ficha.</p>
      )}
    </div>
  );
}
