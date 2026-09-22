# La Fortaleza — Backend API

Control de inventario/restaurante. **Solo backend** por ahora (Next.js App Router + SQLite local). Turso se conecta después cambiando env.

## Stack

- Next.js 16 (API routes)
- TypeScript
- Drizzle ORM + **better-sqlite3** (local)
- JWT (Bearer)
- Zod + ExcelJS (export formato Excel)

## Arranque local

```bash
cd la-fortaleza
cp .env.example .env   # si hace falta
npm install
npm run db:seed
npm run db:import-productos -- "C:\ruta\Control LA FORTALEZA.xlsx"  # opcional
npm run dev
```

Abre `http://localhost:3000` → login **`admin` / `Admin123!`**

### Frontend (chrome Y2K)

Diseño tipo faceplate Nintendo.com ’01: placas periwinkle, barra carbon, señales naranja/ámbar.
**Color secundario / marca:** `#A21112`.

Pantallas: Inicio, Productos, Compra vs Recepción, Transferencias, Producción, Bodegas, Admin Usuarios, Admin Permisos.

## Auth

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "admin", "password": "Admin123!" }
```

Respuesta: `{ ok, data: { token, user, permissions, notice } }`

Luego:

```http
Authorization: Bearer <token>
```

## Módulos

| Módulo | Rutas |
|--------|--------|
| Productos | `GET/POST /api/productos`, `GET/PATCH/DELETE /api/productos/:id`, `GET /api/productos/export` |
| Compra vs recepción | `GET/POST /api/compra-recepcion`, `.../:id`, `.../export` |
| Transferencias | `GET/POST /api/transferencias`, `.../:id`, `.../export` |
| Producción | `GET/POST /api/produccion`, `.../:id`, `.../export` |
| Bodegas | `GET/POST /api/bodegas` |
| Usuarios (super) | `GET/POST /api/admin/usuarios`, `PATCH /api/admin/usuarios/:id` |
| Permisos (super) | `GET/PUT /api/admin/permisos` |

### Crear movimiento (bloqueado al guardar)

Todo create de movimientos exige `confirm: true`. Código y unidad salen del producto (`productId`).

```json
{
  "productId": "...",
  "cantidad": 10,
  "confirm": true
}
```

Registros quedan `locked: true`. Solo **SUPER_USUARIO** puede PATCH/DELETE bloqueados (y si el rol tiene `canUpdate`/`canDelete`).

### Permisos editables

`PUT /api/admin/permisos`:

```json
{
  "permissions": [
    {
      "role": "BODEGA",
      "module": "compra_recepcion",
      "canRead": true,
      "canCreate": true,
      "canUpdate": false,
      "canDelete": false,
      "canExport": true,
      "fieldAccess": {
        "cantidadRecibida": true,
        "fechaRecepcion": true,
        "facturaNotaVenta": true,
        "observaciones": true,
        "cantidad": false,
        "fechaPedido": false,
        "proveedor": false
      }
    }
  ]
}
```

`fieldAccess` vacío = puede escribir todos los campos del módulo. Con claves = solo `true`.

Roles: `SUPER_USUARIO` | `CONTABILIDAD` | `CHEF` | `BODEGA`

## Turso (después)

En `.env`:

```
USE_TURSO=true
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

(El cliente Turso se cablea en `lib/db` cuando toque subir.)

## Seguridad mínima incluida

- Passwords con bcrypt
- JWT firmado
- Permisos por rol/módulo/campo
- Inmutabilidad post-confirm
- Soft-delete de productos
- Sin exponer hash en respuestas de usuarios
