import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-white mb-2">XFG Platform</h1>
        <p className="text-gray-400 mb-8">Agent Onboarding & Activation System</p>
        <Link
          href="/login"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
        >
          Sign In
        </Link>
      </div>
    </main>
  )
}
