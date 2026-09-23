export const PASSWORD_RULES = [
  {
    id: "len",
    label: "Mínimo 8 caracteres",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "upper",
    label: "Una letra mayúscula",
    test: (p: string) => /[A-ZÁÉÍÓÚÜÑ]/.test(p),
  },
  {
    id: "lower",
    label: "Una letra minúscula",
    test: (p: string) => /[a-záéíóúüñ]/.test(p),
  },
  {
    id: "num",
    label: "Un número",
    test: (p: string) => /\d/.test(p),
  },
  {
    id: "special",
    label: "Un símbolo (!@#$…)",
    test: (p: string) => /[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/.test(p),
  },
] as const;

export function passwordChecks(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    ok: rule.test(password),
  }));
}

export function isStrongPassword(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
