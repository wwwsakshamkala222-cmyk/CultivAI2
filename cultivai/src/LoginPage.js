import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signInWithRedirect } from 'aws-amplify/auth';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import './Loginpage.css';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const navigate = useNavigate();

  // Email/Password Login
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setIsEmailLoading(true);

    try {
      const result = await signIn({ username: email, password });
      console.log('✅ Email login result:', JSON.stringify(result, null, 2));

      if (result.isSignedIn === true) {
        setTimeout(() => navigate('/dashboard'), 500);
      } else {
        const { signInStep } = result.nextStep || {};
        switch (signInStep) {
          case 'CONFIRM_SIGN_UP':
            setError('Please verify your email. Check your inbox for the verification code.');
            break;
          case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
            setError('You must set a new password. Please reset your password.');
            break;
          case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
          case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
          case 'CONFIRM_SIGN_IN_WITH_SMS_MFA_CODE':
            setError('MFA verification required. Enter your MFA code.');
            break;
          case 'RESET_PASSWORD':
            setError('Password reset required. Please use "Forgot password".');
            break;
          case 'DONE':
            setTimeout(() => navigate('/dashboard'), 700);
            break;
          case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP': {
            const { sharedSecret } = result.nextStep.totpSetupDetails || {};
            setError(
              `MFA setup required.\n` +
              `1) Open Google Authenticator (or similar)\n` +
              `2) Add this secret: ${sharedSecret}\n` +
              `3) Enter the generated 6-digit code`
            );
            break;
          }
          default:
            setError(`Additional verification required: ${signInStep || 'Unknown step'}`);
        }
      }
    } catch (err) {
      console.error('❌ Email login error:', err);
      if (err.name === 'UserAlreadyAuthenticatedException') {
        navigate('/dashboard');
      } else if (err.name === 'UserNotConfirmedException') {
        setError('Your account is not confirmed. Please check your email.');
      } else if (err.name === 'NotAuthorizedException') {
        setError('Incorrect email or password.');
      } else if (err.name === 'UserNotFoundException') {
        setError('No account with this email. Please sign up.');
      } else {
        setError(err.message || 'Login failed.');
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Google Federated Login (Amplify redirect only — no manual fallback)
  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithRedirect({ provider: 'Google' });
      // If redirect succeeds, the page will unload. No code runs after this.
    } catch (err) {
      console.error('❌ Google login error:', err);
      setError(`Google login failed: ${err.message}`);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Left Side – Brand */}
        <div className="brand-section">
          <div className="brand-content">
            <span className="logo-text">CultivAI</span>
            <div className="logo">
              <img src="/logomain.png" alt="CultivAI Logo" className="logo-icon" />
            </div>
            <div className="brand-text">
              <h1>Smart Farming <br /> Smarter Future</h1>
              <p>Get AI-powered insights for crops, pests, and soil health.</p>
            </div>
          </div>
        </div>

        {/* Right Side – Login Form */}
        <div className="form-section">
          <div className="form-content route-animate">
            <div className="form-header">
              <h2>Sign in</h2>
              <p>
                Don’t have an account?{' '}
                <span
                  onClick={() => navigate('/register')}
                  className="register-link"
                  style={{ cursor: 'pointer' }}
                >
                  Register here!
                </span>
              </p>
            </div>

            {/* Google sign-in */}
            <div className="social-login">
              <button
                type="button"
                className="btn-google"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isEmailLoading}
                aria-disabled={isGoogleLoading || isEmailLoading}
                aria-busy={isGoogleLoading}
              >
                <img
                  className="btn-google__icon"
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  loading="lazy"
                />
                <span>
                  {isGoogleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
                </span>
              </button>
              <div className="social-divider"><span>or</span></div>
            </div>

            <form onSubmit={handleEmailSignIn} className="login-form">
              {/* Email */}
              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="username"
                    disabled={isEmailLoading || isGoogleLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    disabled={isEmailLoading || isGoogleLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isEmailLoading || isGoogleLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="error-message">
                  <strong>⚠️ Error:</strong> {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="login-button"
                disabled={isEmailLoading || isGoogleLoading}
              >
                {isEmailLoading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;