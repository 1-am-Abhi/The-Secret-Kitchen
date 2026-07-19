import bcrypt from "bcryptjs";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { signAdminToken } from "../../middleware/auth";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import type { ChangePasswordInput, LoginInput } from "./auth.schema";

const BCRYPT_ROUNDS = 12;

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const admin = await prisma.adminUser.findUnique({ where: { email } });

  // Always run a hash comparison, even when the account does not exist, so the
  // response time cannot be used to enumerate valid admin emails.
  const fallbackHash = "$2a$12$0000000000000000000000000000000000000000000000000000";
  const matches = await bcrypt.compare(password, admin?.passwordHash ?? fallbackHash);

  if (!admin || !matches || !admin.active) {
    throw AppError.unauthorized("Incorrect email or password.");
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signAdminToken({ sub: admin.id, email: admin.email, role: admin.role });

  res.json({
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) throw AppError.unauthorized();

  const admin = await prisma.adminUser.findUnique({
    where: { id: req.admin.sub },
    select: { id: true, email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
  });

  if (!admin) throw AppError.unauthorized("This account no longer exists.");
  res.json({ admin });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) throw AppError.unauthorized();
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.sub } });
  if (!admin) throw AppError.unauthorized();

  const matches = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!matches) throw AppError.unauthorized("Your current password is incorrect.");

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  });

  res.json({ message: "Password updated." });
});
