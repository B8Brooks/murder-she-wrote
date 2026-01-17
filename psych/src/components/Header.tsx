'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-400 hover:text-green-300">
            Psych
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-300 hover:text-white text-sm">
              Browse
            </Link>

            {loading ? (
              <span className="text-slate-500 text-sm">...</span>
            ) : user ? (
              <>
                <Link href="/profile" className="text-slate-300 hover:text-white text-sm">
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Logout
                </button>
                <span className="text-slate-500 text-sm">
                  {user.name || user.email}
                </span>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-300 hover:text-white text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
