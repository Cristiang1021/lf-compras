import { eq } from "drizzle-orm";
import { round4 } from "@/lib/money";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { AuthError } from "@/lib/auth/request";

export async function getActiveProductOrThrow(productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product || !product.isActive) {
    throw new AuthError("Producto no encontrado o inactivo", 404);
  }
  return product;
}

export function productSnapshot(product: {
  id: string;
  codigo: string;
  producto: string;
  unidadMedida: string;
  precio?: number | null;
}) {
  return {
    productId: product.id,
    codigo: product.codigo,
    producto: product.producto,
    unidadMedida: product.unidadMedida,
    precioUnitario:
      product.precio == null || !Number.isFinite(product.precio)
        ? null
        : round4(product.precio),
  };
}
