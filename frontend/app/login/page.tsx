import GoogleLoginButton from '@/components/GoogleLoginButton';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md rounded-2xl border border-brand-border p-10 shadow-sm">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Login
        </h1>

        <GoogleLoginButton />

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-brand-border" />
          <span className="text-sm text-gray-400">or sign up through email</span>
          <div className="flex-1 h-px bg-brand-border" />
        </div>

        <input
          type="email"
          placeholder="Email ID"
          disabled
          className="w-full bg-brand-gray text-gray-700 placeholder-gray-400 rounded-lg px-4 py-3 mb-4 outline-none cursor-not-allowed"
        />

        <input
          type="password"
          placeholder="Password"
          disabled
          className="w-full bg-brand-gray text-gray-700 placeholder-gray-400 rounded-lg px-4 py-3 mb-6 outline-none cursor-not-allowed"
        />

        <button
          type="button"
          disabled
          className="w-full bg-brand-green text-white font-medium py-3 rounded-lg cursor-not-allowed opacity-90"
        >
          Login
        </button>
      </div>
    </div>
  );
}
