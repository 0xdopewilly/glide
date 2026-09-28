/** The glidepay operator: the one Clerk user id in GLIDE_ADMIN_USER_ID. */
export function isAdminUser(userId: string): boolean {
  const adminId = process.env.GLIDE_ADMIN_USER_ID?.trim();
  return Boolean(adminId) && userId === adminId;
}
