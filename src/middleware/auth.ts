import { NextFunction, Request, Response } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { administrators } from '../db/schema.ts';
import { verifyAdminToken } from '../lib/auth-utils.ts';

export interface AdminContext {
  id: number;
  email: string;
  name: string;
  role: string;
  authMethod: 'password';
}

export interface AuthRequest extends Request {
  admin?: AdminContext;
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'يجب تسجيل الدخول للوصول إلى لوحة الإدارة' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'رمز المصادقة مفقود' });
  }

  // Only allow the owner's server-signed HMAC password session token
  if (!token.startsWith('adm.')) {
    return res.status(401).json({
      error: 'تسجيل الدخول عبر Google معطل؛ الدخول مقتصر على مالك المنصة فقط',
    });
  }

  const payload = verifyAdminToken(token);
  if (!payload) {
    return res
      .status(401)
      .json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً' });
  }

  try {
    // Enforce single primary owner administrator account
    const found = await db
      .select()
      .from(administrators)
      .orderBy(asc(administrators.id))
      .limit(1);

    const primaryAdmin = found[0];
    if (
      !primaryAdmin ||
      !primaryAdmin.isActive ||
      primaryAdmin.id !== payload.adminId
    ) {
      return res
        .status(403)
        .json({ error: 'هذا الحساب غير مصرح له أو تم تعطيله' });
    }

    req.admin = {
      id: primaryAdmin.id,
      email: primaryAdmin.email,
      name: primaryAdmin.name,
      role: primaryAdmin.role,
      authMethod: 'password',
    };
    return next();
  } catch (err) {
    console.error('Admin token lookup error:', err);
    return res.status(500).json({ error: 'خطأ في التحقق من الصلاحيات' });
  }
}
