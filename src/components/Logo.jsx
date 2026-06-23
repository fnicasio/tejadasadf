import React from 'react';

/**
 * Logo component displaying the official corporate logo image
 * and the brand text formatted as a unified identity.
 */
export function Logo({ className = '', size = 120, showText = true, light = false }) {
  const primaryTextColor = light ? '#ffffff' : '#3e271a';
  const accentColor = '#c29d5b'; // Elegant Gold
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Official Logo Image Container */}
      <div 
        className="relative flex items-center justify-center transition-all duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <img 
          src="/logo.png" 
          alt="Tejada's Administradores de Fincas" 
          className="w-full h-full object-contain rounded-2xl shadow-md border"
          style={{ borderColor: 'rgba(194, 157, 91, 0.4)', borderWidth: '2px' }}
        />
      </div>
      
      {/* Unified Corporate Typography (Todo-uno) */}
      {showText && (
        <div className="mt-5 text-center select-none">
          <h2 
            className="tracking-wide text-3xl font-bold m-0" 
            style={{ 
              color: primaryTextColor, 
              fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif", 
              lineHeight: '1.1',
              fontWeight: '700'
            }}
          >
            Tejada's
          </h2>
          <p 
            className="tracking-wider text-base font-semibold mt-1 mb-0" 
            style={{ 
              color: accentColor, 
              fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif", 
              letterSpacing: '0.02em',
              opacity: 0.95
            }}
          >
            Administradores de Fincas
          </p>
        </div>
      )}
    </div>
  );
}

export default Logo;
