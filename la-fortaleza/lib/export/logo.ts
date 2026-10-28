import fs from "fs";
import path from "path";

const FILE = "logo-la-fortaleza.png";

function candidates() {
  return [
    path.join(process.cwd(), "lib", "export", "assets", FILE),
    path.join(process.cwd(), "public", FILE),
    path.join(__dirname, "assets", FILE),
  ];
}

export function readLogoBuffer(): Buffer | null {
  for (const p of candidates()) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch {
      // siguiente ruta
    }
  }
  console.warn("Logo no encontrado para exportar");
  return null;
}
