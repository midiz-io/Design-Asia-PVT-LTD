import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Shield, CheckCircle2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Alert from '@/utils/alert';
import { z } from 'zod';
import DynamicBackground from '@/components/DynamicBackground';
import DigitalClock from '@/components/DigitalClock';

const emailSchema = z.string().email({ message: "Invalid email address" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user, userRole, getDashboardRoute, prefetchDashboard } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentHour, setCurrentHour] = useState(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', hour12: false })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', hour12: false }));
    }, 60000); // Check every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user && userRole) {
      navigate(getDashboardRoute(userRole));
    }
  }, [user, userRole, navigate, getDashboardRoute]);

  const handleEmailBlur = () => {
    if (!email) return;
    try {
      emailSchema.parse(email);
      // If email is valid, check for role hints and prefetch
      const roleHints = JSON.parse(localStorage.getItem('taskvision_role_hints') || '{}');
      const hintedRole = roleHints[email.toLowerCase()];
      if (hintedRole) {
        console.log('Pre-fetching dashboard for hinted role:', hintedRole);
        prefetchDashboard(hintedRole);
      }
    } catch (e) {
      // Ignore validation errors during prefetch
    }
  };

  const validateForm = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        Alert.error('Validation Error', error.errors[0].message);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.error('Login Failed', error.message || 'Invalid email or password');
      }
    } catch (error) {
      Alert.error('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 font-sans relative">
      <DynamicBackground hour={parseInt(currentHour)} />
      
      {/* Main Content - Centered */}
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center relative z-10">
        
        {/* Top/Left Column - Clock and Lottie Animation */}
        <div className="flex flex-col items-center justify-center p-4 md:p-8 order-1 w-full">
          <DigitalClock />
          <div className="mt-8 w-full flex justify-center transform hover:scale-105 transition-all duration-700 ease-in-out">
            {/* @ts-ignore */}
            <dotlottie-wc 
              src={
                parseInt(currentHour) >= 5 && parseInt(currentHour) < 12 
                  ? "https://lottie.host/81a95a63-711e-450a-b328-910ecb2c011e/7Geqy0P8o9.lottie" /* Morning */
                  : parseInt(currentHour) >= 12 && parseInt(currentHour) < 18 
                    ? "https://lottie.host/90315d8f-9a5f-45ef-88a4-bcb8b425a963/4jxNblrnaT.lottie" /* Afternoon */
                    : "https://lottie.host/3697deaa-ddbc-4a46-bd9d-e3a479ffceaa/yW13mQ1g2Z.lottie" /* Evening/Night */
              } 
              className="w-full max-w-[280px] h-auto aspect-square md:max-w-[400px] object-contain drop-shadow-2xl" 
              autoplay 
              loop>
            </dotlottie-wc>
          </div>
        </div>

        {/* Right Column - Sign In Form (Takes full width on mobile) */}
        <div className="w-full max-w-md mx-auto order-2 md:order-2 md:pt-12">
            <div className="w-full">
              
              <div className="space-y-2 pb-8 relative z-10 px-4 md:px-8 text-center">
                <h2 className="text-5xl font-extrabold text-white tracking-tighter drop-shadow-lg">Sign In</h2>
                <p className="text-sm font-medium text-white/90 drop-shadow-md">
                  Enter your details to proceed
                </p>
              </div>
              
              <div className="space-y-6 px-4 md:px-8 pb-10">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-bold ml-4 text-gray-800 dark:text-gray-200">
                      Email Address
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                        <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-[#FA8072] transition-colors duration-300" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={handleEmailBlur}
                        required
                        className="h-14 pl-12 pr-6 rounded-full border-white/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md focus:bg-white/80 dark:focus:bg-gray-800/80 transition-all duration-300 focus:ring-2 focus:ring-white/50 focus:border-white shadow-sm text-base text-gray-900 dark:text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                  
                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-bold ml-4 text-gray-800 dark:text-gray-200">
                      Password
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                        <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-[#FA8072] transition-colors duration-300" />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={handleEmailBlur}
                        required
                        className="h-14 pl-12 pr-12 rounded-full border-white/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md focus:bg-white/80 dark:focus:bg-gray-800/80 transition-all duration-300 focus:ring-2 focus:ring-white/50 focus:border-white shadow-sm text-base text-gray-900 dark:text-white placeholder:text-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-500 hover:text-[#FA8072] transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <Button
                      type="submit"
                      className="w-full h-14 rounded-full text-lg font-bold text-white bg-gradient-to-r from-[#FA8072] to-[#FF7F50] hover:from-[#FF7F50] hover:to-[#FF6347] shadow-[0_8px_20px_rgba(250,128,114,0.3)] hover:shadow-[0_12px_25px_rgba(250,128,114,0.4)] hover:-translate-y-1 transition-all duration-300 border border-white/20"
                      disabled={loading}
                      onMouseEnter={() => {
                        if (email) {
                          const roleHints = JSON.parse(localStorage.getItem('taskvision_role_hints') || '{}');
                          const hintedRole = roleHints[email.toLowerCase()];
                          if (hintedRole) prefetchDashboard(hintedRole);
                        }
                      }}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Signing in...
                        </span>
                      ) : (
                        'Sign In to Dashboard'
                      )}
                    </Button>
                  </div>
                </form>

                {/* Footer Badges */}
                <div className="mt-8 pt-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 py-2.5 px-4 rounded-full">
                      <Shield className="w-4 h-4 text-[#FA8072]" />
                      <span className="font-semibold">Secure 256-bit encryption</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 mt-auto text-center text-xs font-medium text-white/70 relative z-10 drop-shadow-md">
        <p>© 2025 Design Asia Group (Pvt) Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Auth;

