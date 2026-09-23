import { NextResponse } from "next/server";

/**
 * Placeholder intake endpoint.
 *
 * It validates and normalises the submission, then logs it. Wire the marked
 * section to your transport of choice (Resend, Postmark, SES, a CRM webhook)
 * and add rate limiting before this goes anywhere near production -- an
 * unthrottled public POST route is an invitation.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const company = String(body.company ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (name.length < 2) {
    return NextResponse.json({ error: "Please tell us your name." }, { status: 422 });
  }
  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 422 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "A sentence or two about the project, please." }, { status: 422 });
  }
  // Cheap ceiling so a single request can't be used to dump megabytes into logs.
  if (message.length > 5000) {
    return NextResponse.json({ error: "That message is a little too long — trim it down?" }, { status: 422 });
  }

  // --- Replace with a real transport -------------------------------------
  console.log("[nexviva] new enquiry", { name, email, company, message });
  // await resend.emails.send({ ... })
  // -----------------------------------------------------------------------

  return NextResponse.json({ ok: true }, { status: 200 });
}
