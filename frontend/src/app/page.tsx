import { useEffect } from 'react';
import { useSession } from '@/hooks/useSession';

/**
 * Clean and simple Login screen matching the Figma mockup.
 *
 * - Left side of the viewport is off-white background.
 * - Card is centered, clean white, with round corners and light borders.
 * - Google OAuth button is functional, while Email/Password fields are mock placeholders.
 */
export default function HomePage() {
  const { login } = useSession();

  const handleCredentialResponse = async (response: any) => {
    const idToken = response.credential;
    const backendUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
    try {
      const res = await fetch(`${backendUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        login(data.token, data.user);
      } else {
        alert(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Could not connect to backend server. Make sure it is running.');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { 
          theme: 'outline', 
          size: 'large', 
          width: '344',
          text: 'signin_with',
          shape: 'rectangular'
        }
      );
    }
  }, []);

  const handleMockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Email login is a visual mockup. Please click the official Google button to sign in.');
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#ffffff] text-[#0f172a]">
      {/* Container */}
      <div className="w-full max-w-[460px] p-6">
        
        {/* Form Card */}
        <div className="bg-[#ffffff] rounded-2xl p-10 border border-[#e2e8f0] shadow-sm flex flex-col items-center">
          
          {/* Header */}
          <h1 className="text-2xl font-bold text-[#0f172a] mb-6 tracking-tight">
            Login
          </h1>

          {/* Google Sign In Button Container */}
          <div className="w-full flex justify-center mb-4">
            <div id="google-signin-btn" className="w-[344px] min-h-[40px]"></div>
          </div>

          {/* Divider Text */}
          <div className="text-xs text-[#94a3b8] font-normal mb-6">
            or sign up through email
          </div>

          {/* Form */}
          <form onSubmit={handleMockSubmit} className="w-full space-y-4">
            
            {/* Email Input */}
            <div>
              <input
                type="email"
                placeholder="Email ID"
                required
                className="w-full px-4 py-3 bg-[#f1f5f9] text-[#0f172a] placeholder-[#94a3b8] rounded-md border-0 outline-none text-sm focus:ring-2 focus:ring-[#00a854] transition-all"
              />
            </div>

            {/* Password Input */}
            <div>
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full px-4 py-3 bg-[#f1f5f9] text-[#0f172a] placeholder-[#94a3b8] rounded-md border-0 outline-none text-sm focus:ring-2 focus:ring-[#00a854] transition-all"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-[#00a854] hover:bg-[#00944b] text-white font-semibold rounded-md transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:ring-offset-2"
              >
                Login
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </main>
  );
}
