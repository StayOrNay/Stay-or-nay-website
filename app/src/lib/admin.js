// Moderation on StayOrNay is restricted to the site owner only — there's no
// "moderator" role in the database, just a hardcoded allowlist checked
// against the signed-in Supabase user's email. If you (Alexander) end up
// signing in to the live site with a different email than the one below,
// add it here — this is the only place that needs to change.
export const ADMIN_EMAILS = ['agg200305@gmail.com'];

export function isAdmin(user) {
  return Boolean(user && user.email && ADMIN_EMAILS.includes(user.email));
}
