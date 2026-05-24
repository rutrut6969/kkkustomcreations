import { loginAdmin } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin-form";
import { BrandLogo } from "@/components/brand-logo";

export default function AdminLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-aqua-700">Admin</p>
          <h1 className="text-3xl font-black">K&K Kustom Kreations</h1>
        </div>
        <AdminForm action={loginAdmin} submitLabel="Log in">
          <input type="hidden" name="next" value={searchParams.next ?? "/admin"} />
          <label className="form-label">
            Admin email
            <input name="email" type="email" required autoComplete="username" placeholder="admin@example.com" className="form-control" />
          </label>
          <label className="form-label">
            Password
            <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className="form-control" />
          </label>
        </AdminForm>
      </div>
    </section>
  );
}
