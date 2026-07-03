export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="max-w-sm mx-auto mt-24">
      <div className="card p-6">
        <h1 className="text-lg font-semibold mb-1">YT Trend Research</h1>
        <p className="text-sm text-slate-400 mb-5">Enter your panel password.</p>
        <form action="/api/login" method="POST" className="space-y-3">
          <input className="input" type="password" name="password" placeholder="Password" autoFocus />
          <button className="btn btn-brand w-full justify-center" type="submit">
            Sign in
          </button>
          {searchParams.error && (
            <p className="text-xs text-red-400">Wrong password, try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}
