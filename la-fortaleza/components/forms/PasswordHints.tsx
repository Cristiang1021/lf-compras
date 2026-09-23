"use client";

import { passwordChecks } from "@/lib/password";

export function PasswordHints({
  password,
  optional,
}: {
  password: string;
  optional?: boolean;
}) {
  if (optional && !password) {
    return (
      <p className="micro" style={{ margin: "6px 0 0" }}>
        Déjala vacía para no cambiarla. Si escribes una, debe cumplir los
        requisitos.
      </p>
    );
  }

  const checks = passwordChecks(password);
  const done = checks.filter((c) => c.ok).length;

  return (
    <ul className="pw-hints" aria-live="polite">
      {checks.map((c) => (
        <li key={c.id} className={c.ok ? "is-ok" : ""}>
          <span aria-hidden>{c.ok ? "✓" : "○"}</span>
          {c.label}
        </li>
      ))}
      <li className="pw-hints-count">
        {done} de {checks.length} requisitos
      </li>
    </ul>
  );
}
