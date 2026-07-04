export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-sky-100 via-ink to-amber-100">
      <div className="card p-8 w-full max-w-sm shadow-pop">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-brand text-sun font-black text-xl">▲</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">YT Trend Research</h1>
            <p className="text-xs text-zinc-500">Content command center</p>
          </div>
        </div>
        <form action="/api/login" method="POST" className="space-y-3">
          <div>
            <label className="label">Panel password</label>
            <input className="input" type="password" name="password" placeholder="••••••••" autoFocus />
          </div>
          <button className="btn btn-brand w-full" type="submit">
            Sign in →
          </button>
          {searchParams.error && <p className="toast-err !mb-0">Wrong password, try again.</p>}
        </form>
      </div>
    </div>
  );
}
