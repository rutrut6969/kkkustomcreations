import { acceptAdminInvite } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { BrandLogo } from "@/components/brand-logo";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/admin-security";

export const dynamic = "force-dynamic";

export default async function AcceptAdminInvitePage({ params }: { params: { token: string } }) {
  const invite =
    hasDatabaseUrl() && params.token
      ? await (prisma as any).adminInvite.findUnique({ where: { tokenHash: hashToken(params.token) } })
      : null;
  const valid = invite && !invite.acceptedAt && invite.expiresAt > new Date();

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Admin Invite</p>
          <h1 className="text-3xl font-black">Create your admin account</h1>
          {invite?.email && <p className="mt-2 break-all text-sm font-bold text-boutique-charcoal/60">{invite.email}</p>}
        </div>

        {!valid ? (
          <div className="rounded-boutique border border-pink-100 bg-white p-5 text-center shadow-soft">
            <p className="font-black">This invite is invalid or expired.</p>
            <p className="mt-2 text-sm text-boutique-charcoal/65">Ask a Super Admin to send a fresh invite.</p>
          </div>
        ) : (
          <AdminForm action={acceptAdminInvite} submitLabel="Activate Account">
            <input type="hidden" name="token" value={params.token} />
            <label className="form-label">
              Full name
              <input name="name" required autoComplete="name" className="form-control" />
            </label>
            <label className="form-label">
              Password
              <input name="password" type="password" required minLength={10} autoComplete="new-password" className="form-control" />
            </label>
            <p className="text-xs font-bold leading-5 text-boutique-charcoal/60">
              Use at least 10 characters. Your device will be recorded after login so it can be managed from Security.
            </p>
          </AdminForm>
        )}
      </div>
    </section>
  );
}
