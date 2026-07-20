import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Drop the cached catalogue so the next request re-reads PostgreSQL.
 *
 * The admin panel calls this after any change to the menu — availability, price,
 * a new dish, a deletion — so an edit is visible on the storefront immediately
 * instead of whenever the 60s window happens to lapse. Waiting a minute to see
 * whether you actually took a sold-out dish off the menu is not good enough
 * during service.
 *
 * There is deliberately no secret on this route. It reveals nothing and changes
 * no data: the worst a caller can do is make the storefront fetch a fresh copy
 * of a menu that is already public. Adding a token would mean shipping it to
 * the browser, where it would not be a secret anyway.
 */
export async function POST() {
  revalidateTag("menu");
  return NextResponse.json({ revalidated: true });
}
