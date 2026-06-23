import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import Logo from './Logo';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Client-side validations
  const validateForm = () => {
    if (!email.trim()) {
      setError('Por favor, introduce tu correo electrónico.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('El formato del correo electrónico no es válido.');
      return false;
    }
    if (!password) {
      setError('Por favor, introduce tu contraseña.');
      return false;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth observer in App.jsx will capture the successful login and redirect
    } catch (err) {
      console.error("Firebase Login Error:", err.code, err.message);
      
      // Translate Firebase errors to friendly Spanish messages
      switch (err.code) {
        case 'auth/invalid-email':
          setError('El correo electrónico proporcionado no es válido.');
          break;
        case 'auth/user-disabled':
          setError('Esta cuenta de usuario ha sido deshabilitada.');
          break;
        case 'auth/user-not-found':
          setError('No existe ningún usuario registrado con este correo electrónico.');
          break;
        case 'auth/wrong-password':
          setError('La contraseña introducida es incorrecta.');
          break;
        case 'auth/invalid-credential':
          setError('Las credenciales introducidas no son correctas. Por favor, compruébelas.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos fallidos. Esta cuenta ha sido bloqueada temporalmente. Inténtalo más tarde.');
          break;
        case 'auth/network-request-failed':
          setError('Error de conexión a internet. Revisa tu red e inténtalo de nuevo.');
          break;
        default:
          setError('Ha ocurrido un error inesperado al iniciar sesión. Inténtalo de nuevo.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-container">
        {/* Company logo section - Centered and without redundant text */}
        <div className="flex justify-center w-full mb-6">
          <Logo size={140} showText={false} />
        </div>

        <h3 className="text-center font-serif text-lg tracking-wide uppercase mb-6" style={{ color: 'var(--primary-medium)' }}>
          Acceso Administradores
        </h3>

        {/* Display descriptive error alert if validation or login fails */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          {/* Email input field */}
          <div className="form-group">
            <div className="input-wrapper">
              <input
                id="email-input"
                type="email"
                className="form-input"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoComplete="email"
                required
              />
              <Mail className="input-icon" size={18} />
            </div>
          </div>

          {/* Password input field */}
          <div className="form-group">
            <div className="input-wrapper">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <Lock className="input-icon" size={18} />
              
              {/* Toggle password visibility */}
              {password && (
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            className="btn-primary mt-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
