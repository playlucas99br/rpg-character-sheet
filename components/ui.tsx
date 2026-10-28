"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import {
  X,
  Eye,
  Flame,
  Swords,
  Shield,
  Ghost,
  Sparkles,
  ArrowUpRight,
  UserRound,
  Skull,
} from "lucide-react";
import type { Sheet, SystemId } from "../lib/game/types";
import { systemById } from "../lib/game/systems";

export function TabList({
  id,
  label,
  tabs,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  tabs: ReadonlyArray<readonly [string, string]>;
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <div className={className} role="tablist" aria-label={label}>
      {tabs.map(([key, title], index) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`${id}-tab-${key}`}
          aria-controls={value === key ? `${id}-panel-${key}` : undefined}
          aria-selected={value === key}
          tabIndex={value === key ? 0 : -1}
          onClick={() => onChange(key)}
          onKeyDown={(event) => {
            let next: number;
            switch (event.key) {
              case "ArrowRight": next = (index + 1) % tabs.length; break;
              case "ArrowLeft": next = (index - 1 + tabs.length) % tabs.length; break;
              case "Home": next = 0; break;
              case "End": next = tabs.length - 1; break;
              default: return;
            }
            event.preventDefault();
            onChange(tabs[next][0]);
            const target = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ block: "nearest", inline: "nearest" });
          }}
        >
          {title}
        </button>
      ))}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Die({
  value,
  className = "",
}: {
  value?: string | number;
  className?: string;
}) {
  return (
    <span className={`die ${className}`} aria-hidden="true">
      <svg viewBox="0 0 80 88" fill="none">
        <path d="M40 3 74 23 74 64 40 85 6 64 6 23Z" />
        <path d="m40 3-18 30 36 0Zm34 20L58 33l16 31M6 23l16 10L6 64m0 0 16-31 18 52 18-52 16 31M6 64h68" />
      </svg>
      {value !== undefined && <b>{value}</b>}
    </span>
  );
}
const systemIcons = {
  ordem: Eye,
  jujutsu: Flame,
  dnd: Swords,
  cthulhu: Ghost,
  tormenta: Shield,
  custom: Sparkles,
};
export function SystemMark({
  system,
  className = "",
}: {
  system: SystemId;
  className?: string;
}) {
  const Icon = systemIcons[system] || Sparkles,
    def = systemById(system);
  return (
    <span className={`system-mark ${className}`} style={{ color: def.color }}>
      <Icon size={16} />
      {def.short}
    </span>
  );
}
export function Portrait({
  sheet,
  size = "medium",
}: {
  sheet: Pick<Sheet, "name" | "tone" | "type" | "portraitAssetId">;
  size?: "small" | "medium" | "large";
}) {
  const Icon = sheet.type === "monster" ? Skull : UserRound;
  const [failedId, setFailedId] = useState<string>();
  return (
    <div className={`portrait ${size} ${sheet.tone}`} aria-hidden="true">
      <span className="portrait-ring" />
      <Icon />
      <span className="portrait-spark" />
      <span className="portrait-initial">{sheet.name.slice(0, 1)}</span>
      {sheet.portraitAssetId && failedId !== sheet.portraitAssetId && <img className="portrait-photo" src={`/api/media/image?assetId=${sheet.portraitAssetId}`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedId(sheet.portraitAssetId)} />}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
      el.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeRef.current();
      }}
      aria-labelledby={titleId}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">NEXO / SUA MESA</span>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar janela"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Empty({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || <Sparkles />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
