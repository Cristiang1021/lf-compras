-- La Fortaleza — precios, montos y permiso de editar compras abiertas.
-- Correr UNA vez en Turso, sobre la base que ya está en producción, ANTES de desplegar.
-- No crea productos. No toca Turso local.
-- Si alguna línea dice "duplicate column", esa columna ya existía: sigue con el resto.

-- 1) Precio del producto (por 1 unidad de medida). Null = sin precio.
ALTER TABLE products ADD COLUMN precio REAL;

-- 2) Precio copiado en cada línea al guardar el documento.
ALTER TABLE compra_lineas ADD COLUMN precio_unitario REAL;
ALTER TABLE transferencia_lineas ADD COLUMN precio_unitario REAL;
ALTER TABLE produccion_lineas ADD COLUMN precio_unitario REAL;

-- 3) Permisos extra. Los dos flags nacen en 0 (apagados) para todos los roles.
CREATE TABLE IF NOT EXISTS role_price_access (
  role TEXT PRIMARY KEY,
  can_see_prices INTEGER NOT NULL DEFAULT 0,
  can_edit_open_compra INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO role_price_access (role, can_see_prices, can_edit_open_compra)
VALUES
  ('SUPER_USUARIO', 0, 0),
  ('CONTABILIDAD', 0, 0),
  ('CHEF', 0, 0),
  ('BODEGA', 0, 0);

-- 4) Precios del CSV. Solo actualiza códigos que ya existen y están activos.
-- No se incluyen Car-00086, Car-00087, Car-00088 ni Lic-00038: no están en el maestro.
UPDATE products SET precio = 1.7630, updated_at = datetime('now') WHERE codigo = 'Acei-Gra-00002' AND is_active = 1;
UPDATE products SET precio = 0.5400, updated_at = datetime('now') WHERE codigo = 'Acei-Gra-00006' AND is_active = 1;
UPDATE products SET precio = 4.0780, updated_at = datetime('now') WHERE codigo = 'Acei-Gra-00007' AND is_active = 1;
UPDATE products SET precio = 0.6830, updated_at = datetime('now') WHERE codigo = 'Acei-Gra-0001' AND is_active = 1;
UPDATE products SET precio = 2.8130, updated_at = datetime('now') WHERE codigo = 'Acei-Gra-00027' AND is_active = 1;
UPDATE products SET precio = 1.4700, updated_at = datetime('now') WHERE codigo = 'Agua-R-00007' AND is_active = 1;
UPDATE products SET precio = 0.3770, updated_at = datetime('now') WHERE codigo = 'Agua-R-00015' AND is_active = 1;
UPDATE products SET precio = 0.1810, updated_at = datetime('now') WHERE codigo = 'Agua-R-00016' AND is_active = 1;
UPDATE products SET precio = 0.2710, updated_at = datetime('now') WHERE codigo = 'Agu-R-00012' AND is_active = 1;
UPDATE products SET precio = 0.2520, updated_at = datetime('now') WHERE codigo = 'Agu-R-00015' AND is_active = 1;
UPDATE products SET precio = 0.0770, updated_at = datetime('now') WHERE codigo = 'Caf-00007' AND is_active = 1;
UPDATE products SET precio = 3.9770, updated_at = datetime('now') WHERE codigo = 'Car-00021' AND is_active = 1;
UPDATE products SET precio = 4.9710, updated_at = datetime('now') WHERE codigo = 'Car-00044' AND is_active = 1;
UPDATE products SET precio = 16.4940, updated_at = datetime('now') WHERE codigo = 'Car-00051' AND is_active = 1;
UPDATE products SET precio = 4.9480, updated_at = datetime('now') WHERE codigo = 'Car-00084' AND is_active = 1;
UPDATE products SET precio = 0.8840, updated_at = datetime('now') WHERE codigo = 'Cerv-00004' AND is_active = 1;
UPDATE products SET precio = 1.0990, updated_at = datetime('now') WHERE codigo = 'Espec-00003' AND is_active = 1;
UPDATE products SET precio = 10.7690, updated_at = datetime('now') WHERE codigo = 'Espec-00005' AND is_active = 1;
UPDATE products SET precio = 0.6490, updated_at = datetime('now') WHERE codigo = 'Espec-00006' AND is_active = 1;
UPDATE products SET precio = 6.7050, updated_at = datetime('now') WHERE codigo = 'Espec-00008' AND is_active = 1;
UPDATE products SET precio = 2.1080, updated_at = datetime('now') WHERE codigo = 'Espec-00010' AND is_active = 1;
UPDATE products SET precio = 3.3090, updated_at = datetime('now') WHERE codigo = 'Espec-00011' AND is_active = 1;
UPDATE products SET precio = 3.0000, updated_at = datetime('now') WHERE codigo = 'Espec-00012' AND is_active = 1;
UPDATE products SET precio = 4.4000, updated_at = datetime('now') WHERE codigo = 'Espec-00015' AND is_active = 1;
UPDATE products SET precio = 5.8330, updated_at = datetime('now') WHERE codigo = 'Espec-00021' AND is_active = 1;
UPDATE products SET precio = 0.3400, updated_at = datetime('now') WHERE codigo = 'Espec-00027' AND is_active = 1;
UPDATE products SET precio = 4.8310, updated_at = datetime('now') WHERE codigo = 'Espec-00030' AND is_active = 1;
UPDATE products SET precio = 9.9800, updated_at = datetime('now') WHERE codigo = 'Espec-00037' AND is_active = 1;
UPDATE products SET precio = 14.7500, updated_at = datetime('now') WHERE codigo = 'Espec-00041' AND is_active = 1;
UPDATE products SET precio = 14.8840, updated_at = datetime('now') WHERE codigo = 'Espec-00055' AND is_active = 1;
UPDATE products SET precio = 4.9400, updated_at = datetime('now') WHERE codigo = 'Espec-00059' AND is_active = 1;
UPDATE products SET precio = 1.4710, updated_at = datetime('now') WHERE codigo = 'Espec-00062' AND is_active = 1;
UPDATE products SET precio = 8.5700, updated_at = datetime('now') WHERE codigo = 'Espec-00073' AND is_active = 1;
UPDATE products SET precio = 0.0370, updated_at = datetime('now') WHERE codigo = 'Espec-00082' AND is_active = 1;
UPDATE products SET precio = 1.0920, updated_at = datetime('now') WHERE codigo = 'Gran-00005' AND is_active = 1;
UPDATE products SET precio = 13.3330, updated_at = datetime('now') WHERE codigo = 'Har-00006' AND is_active = 1;
UPDATE products SET precio = 3.7600, updated_at = datetime('now') WHERE codigo = 'Har-00010' AND is_active = 1;
UPDATE products SET precio = 3.4000, updated_at = datetime('now') WHERE codigo = 'Har-00033' AND is_active = 1;
UPDATE products SET precio = 6.7100, updated_at = datetime('now') WHERE codigo = 'Lact-00003' AND is_active = 1;
UPDATE products SET precio = 3.0430, updated_at = datetime('now') WHERE codigo = 'Lact-00004' AND is_active = 1;
UPDATE products SET precio = 0.9500, updated_at = datetime('now') WHERE codigo = 'Lact-00007' AND is_active = 1;
UPDATE products SET precio = 30.9000, updated_at = datetime('now') WHERE codigo = 'Lact-00015' AND is_active = 1;
UPDATE products SET precio = 4.7180, updated_at = datetime('now') WHERE codigo = 'Lact-00035' AND is_active = 1;
UPDATE products SET precio = 31.2400, updated_at = datetime('now') WHERE codigo = 'Lact-00038' AND is_active = 1;
UPDATE products SET precio = 0.2900, updated_at = datetime('now') WHERE codigo = 'Ot-00003' AND is_active = 1;
UPDATE products SET precio = 6.5400, updated_at = datetime('now') WHERE codigo = 'Otras-B-00001' AND is_active = 1;
UPDATE products SET precio = 1.3440, updated_at = datetime('now') WHERE codigo = 'Veg-00001' AND is_active = 1;
UPDATE products SET precio = 3.1360, updated_at = datetime('now') WHERE codigo = 'Veg-00002' AND is_active = 1;
UPDATE products SET precio = 1.3590, updated_at = datetime('now') WHERE codigo = 'Veg-00009' AND is_active = 1;
UPDATE products SET precio = 2.3610, updated_at = datetime('now') WHERE codigo = 'Veg-00016' AND is_active = 1;
UPDATE products SET precio = 0.5560, updated_at = datetime('now') WHERE codigo = 'Veg-00021' AND is_active = 1;
UPDATE products SET precio = 0.7140, updated_at = datetime('now') WHERE codigo = 'Veg-00022' AND is_active = 1;
UPDATE products SET precio = 10.0000, updated_at = datetime('now') WHERE codigo = 'Veg-00024' AND is_active = 1;
UPDATE products SET precio = 12.0000, updated_at = datetime('now') WHERE codigo = 'Veg-00028' AND is_active = 1;
UPDATE products SET precio = 1.5960, updated_at = datetime('now') WHERE codigo = 'Veg-00033' AND is_active = 1;
UPDATE products SET precio = 1.4290, updated_at = datetime('now') WHERE codigo = 'Veg-00035' AND is_active = 1;
UPDATE products SET precio = 0.7940, updated_at = datetime('now') WHERE codigo = 'Veg-00046' AND is_active = 1;
UPDATE products SET precio = 2.0490, updated_at = datetime('now') WHERE codigo = 'Veg-00047' AND is_active = 1;
UPDATE products SET precio = 0.3420, updated_at = datetime('now') WHERE codigo = 'Veg-00051' AND is_active = 1;
UPDATE products SET precio = 2.3360, updated_at = datetime('now') WHERE codigo = 'Veg-00053' AND is_active = 1;
UPDATE products SET precio = 0.8770, updated_at = datetime('now') WHERE codigo = 'Veg-00071' AND is_active = 1;
UPDATE products SET precio = 11.7650, updated_at = datetime('now') WHERE codigo = 'Veg-00081' AND is_active = 1;
UPDATE products SET precio = 7.4280, updated_at = datetime('now') WHERE codigo = 'Veg-00087' AND is_active = 1;
UPDATE products SET precio = 6.6100, updated_at = datetime('now') WHERE codigo = 'Veg-00090' AND is_active = 1;
UPDATE products SET precio = 0.1500, updated_at = datetime('now') WHERE codigo = 'Veg-00094' AND is_active = 1;
UPDATE products SET precio = 3.0610, updated_at = datetime('now') WHERE codigo = 'Veg-00117' AND is_active = 1;
UPDATE products SET precio = 2.1430, updated_at = datetime('now') WHERE codigo = 'Veg-00122' AND is_active = 1;
UPDATE products SET precio = 0.1760, updated_at = datetime('now') WHERE codigo = 'Veg-00132' AND is_active = 1;
UPDATE products SET precio = 12.1300, updated_at = datetime('now') WHERE codigo = 'Vod-00001' AND is_active = 1;

-- 5) Copia ese precio a las líneas ya guardadas que todavía no lo tienen.
UPDATE compra_lineas
SET precio_unitario = (SELECT precio FROM products WHERE products.id = compra_lineas.product_id)
WHERE precio_unitario IS NULL
  AND EXISTS (
    SELECT 1 FROM products
    WHERE products.id = compra_lineas.product_id AND products.precio IS NOT NULL
  );

UPDATE transferencia_lineas
SET precio_unitario = (SELECT precio FROM products WHERE products.id = transferencia_lineas.product_id)
WHERE precio_unitario IS NULL
  AND EXISTS (
    SELECT 1 FROM products
    WHERE products.id = transferencia_lineas.product_id AND products.precio IS NOT NULL
  );

UPDATE produccion_lineas
SET precio_unitario = (SELECT precio FROM products WHERE products.id = produccion_lineas.product_id)
WHERE precio_unitario IS NULL
  AND EXISTS (
    SELECT 1 FROM products
    WHERE products.id = produccion_lineas.product_id AND products.precio IS NOT NULL
  );
