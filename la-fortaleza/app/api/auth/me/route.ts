import { authenticateRequest } from "@/lib/auth/request";
import { handleRouteError, jsonOk } from "@/lib/api/response";
import { ensureDatabase } from "@/lib/db/ensure";
import { MODULES } from "@/lib/db/schema";
import { getRolePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const { user } = await authenticateRequest(request);
    const permissions = [];
    for (const module of MODULES) {
      permissions.push({
        module,
        ...(await getRolePermission(user.role, module)),
      });
    }
    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
      },
      permissions,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
