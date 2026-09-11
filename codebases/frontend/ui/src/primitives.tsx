"use client";

import { cloneElement, isValidElement } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { Tone } from "./tokens";

/**
 * Primitives. Chaque contrôle visible porte un data-control-id (registre d'interactions) :
 * un contrôle sans contrat est un bloqueur de release.
 */
export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonState = "default" | "loading" | "blocked";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  controlId: string;
  variant?: ButtonVariant;
  state?: ButtonState;
  children: ReactNode;
}

export function Button({ controlId, variant = "primary", state = "default", children, disabled, ...rest }: ButtonProps) {
  const blocked = state === "blocked";
  return (
    <button
      {...rest}
      data-control-id={controlId}
      data-state={state}
      className={`dp-btn dp-btn-${variant}`}
      disabled={disabled || state === "loading"}
      aria-disabled={blocked || undefined}
      aria-busy={state === "loading" || undefined}
      onClick={blocked ? (e) => e.preventDefault() : rest.onClick}
    >
      {state === "loading" ? "Veuillez patienter" : children}
    </button>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="dp-actions">{children}</div>;
}

export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

/** Champ de formulaire : libellé, aide, erreur (l'erreur nomme l'action et le chemin de récupération). */
/**
 * Un champ et ses annexes. L'aide et l'erreur portent un identifiant, et le champ le référence :
 * sans cela, un lecteur d'écran annonce l'étiquette seule et laisse l'utilisateur deviner la contrainte.
 * La liaison est posée ici, sur l'enfant, pour qu'aucun écran n'ait à y penser.
 */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const described = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  const enfant =
    isValidElement(children) && described
      ? cloneElement(children as ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>, {
          "aria-describedby": described,
          ...(error ? { "aria-invalid": true } : {}),
        })
      : children;
  return (
    <div className="dp-field">
      <label htmlFor={id}>{label}</label>
      {enfant}
      {hint && !error ? <span className="dp-hint" id={`${id}-hint`}>{hint}</span> : null}
      {error ? <span className="dp-error" id={`${id}-error`} role="alert">{error}</span> : null}
    </div>
  );
}

export function Input({ invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} className="dp-input" aria-invalid={invalid || undefined} />;
}

export function Select({ invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; children: ReactNode }) {
  return (
    <select {...rest} className="dp-select" aria-invalid={invalid || undefined}>
      {children}
    </select>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="dp-textarea" />;
}

export function Checkbox({ id, label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: ReactNode }) {
  return (
    <label className="dp-checkbox" htmlFor={id}>
      <input type="checkbox" id={id} {...rest} />
      <span>{label}</span>
    </label>
  );
}

export type StatusKind = "verified" | "pending" | "restricted" | "revoked" | "neutral";
const STATUS_TONE: Record<StatusKind, Tone> = { verified: "success", pending: "warning", restricted: "info", revoked: "danger", neutral: "neutral" };

/** Statut d'un document ou d'un dossier : la seule utilisation autorisée des couleurs sémantiques. */
export function StatusBadge({ status, label, controlId }: { status: StatusKind; label: string; controlId?: string }) {
  return (
    <span className="dp-badge" data-tone={STATUS_TONE[status]} data-control-id={controlId}>
      {label}
    </span>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="dp-badge" data-tone={tone}>
      {children}
    </span>
  );
}

export function Panel({ title, children, controlId }: { title?: string; children: ReactNode; controlId?: string }) {
  return (
    <section className="dp-panel" data-control-id={controlId}>
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  );
}

/** Squelette de chargement : chaque écran possède ses états chargement, vide, erreur. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="dp-stack" aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="dp-skeleton" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="dp-toast" role="status" aria-live="polite">
      {children}
    </div>
  );
}
