'use client'

import * as React from 'react'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

interface InputProps {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  [key: string]: any;
}

const AppInput = (props: InputProps) => {
  const { label, placeholder, icon, ...rest } = props;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="w-full min-w-[200px] relative">
      { label && 
        <label className='block mb-2 text-sm'>
          {label}
        </label>
      }
      <div className="relative w-full">
        <input
          type="text"
          className="peer relative z-10 border-2 border-[var(--color-border)] h-13 w-full rounded-md bg-[var(--color-surface)] px-4 font-thin outline-none drop-shadow-sm transition-all duration-200 ease-in-out focus:bg-[var(--color-bg)] placeholder:font-medium"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, var(--color-text-primary) 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, var(--color-text-primary) 0%, transparent 70%)`,
              }}
            />
          </>
        )}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

const LoginComponent = () => {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const leftSection = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - leftSection.left,
      y: e.clientY - leftSection.top
    });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      if (data.role === 'superuser') {
        window.location.href = '/superuser';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
      setIsLoading(false);
    }
  };

   const socialIcons = [
    {
      // Google
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 10.2v3.92h5.52c-.24 1.26-1.44 3.7-5.52 3.7A6.3 6.3 0 0 1 5.7 12A6.3 6.3 0 0 1 12 6.18c1.8 0 3.01.77 3.7 1.43l2.52-2.42C16.6 3.68 14.53 2.6 12 2.6A9.4 9.4 0 0 0 2.6 12A9.4 9.4 0 0 0 12 21.4c5.45 0 9.06-3.83 9.06-9.23c0-.62-.07-1.09-.15-1.57z"
          />
        </svg>
      ),
      href: '#',
      gradient: 'bg-[var(--color-bg)]',
    },
    {
      // Microsoft
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3 3h8.5v8.5H3z" />
          <path fill="currentColor" d="M12.5 3H21v8.5h-8.5z" />
          <path fill="currentColor" d="M3 12.5h8.5V21H3z" />
          <path fill="currentColor" d="M12.5 12.5H21V21h-8.5z" />
        </svg>
      ),
      href: '#',
      bg: 'bg-[var(--color-bg)]',
    },
    {
      // GitHub
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.77.6-3.36-1.34-3.36-1.34c-.45-1.15-1.1-1.46-1.1-1.46c-.9-.62.07-.61.07-.61c1 .07 1.53 1.03 1.53 1.03c.89 1.52 2.34 1.08 2.91.82c.09-.65.35-1.08.63-1.33c-2.21-.25-4.54-1.11-4.54-4.95c0-1.09.39-1.98 1.03-2.68c-.1-.25-.45-1.27.1-2.65c0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.71.11 2.51.34c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.38.2 2.4.1 2.65c.64.7 1.03 1.59 1.03 2.68c0 3.85-2.34 4.69-4.57 4.94c.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2"
          />
        </svg>
      ),
      href: '#',
      bg: 'bg-[var(--color-bg)]',
    },
  ];

  return (
    <div className="h-screen w-[100%] bg-[var(--color-bg)] flex items-center justify-center p-4 relative">
      <a href="/" className="absolute top-4 left-4 z-50 flex items-center gap-2 text-white hover:text-emerald-400 transition-colors group">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span className="font-semibold text-sm">Tattvadrishti</span>
      </a>
      <div className='card w-[80%] lg:w-[70%] md:w-[55%] flex justify-between h-[600px]'>
        <div
          className='w-full lg:w-1/2 px-4 lg:px-16 left h-full relative overflow-hidden'
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
            <div
              className={`absolute pointer-events-none w-[500px] h-[500px] bg-gradient-to-r from-emerald-300/30 via-cyan-300/30 to-teal-300/30 rounded-full blur-xl transition-opacity duration-200 ${
                isHovering ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)`,
                transition: 'transform 0.1s ease-out'
              }}
            />
            <div className="form-container sign-in-container h-full z-10">
              <form className='text-center py-10 md:py-20 grid gap-2 h-full' onSubmit={handleSubmit}>
                <div className='grid gap-4 md:gap-6 mb-2'>
                  <h1 className='text-3xl md:text-4xl font-extrabold'>Sign in</h1>
                  <div className="social-container">
                    <div className="flex items-center justify-center">
                      <ul className="flex gap-3 md:gap-4">
                        {socialIcons.map((social, index) => {
                          return (
                            <li key={index} className="list-none">
                              <a
                                href={social.href}
                                className={`w-[2.5rem] md:w-[3rem] h-[2.5rem] md:h-[3rem] bg-[var(--color-bg-2)] rounded-full flex justify-center items-center relative z-[1] border-3 border-[var(--color-text-primary)] overflow-hidden group`}
                              >
                                <div
                                  className={`absolute inset-0 w-full h-full ${
                                    social.gradient || social.bg
                                  } scale-y-0 origin-bottom transition-transform duration-500 ease-in-out group-hover:scale-y-100`}
                                />
                                <span className="text-[1.5rem] text-[hsl(203,92%,8%)] transition-all duration-500 ease-in-out z-[2] group-hover:text-[var(--color-text-primary)] group-hover:rotate-y-360">
                                  {social.icon}
                                </span>
                              </a>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                </div>
                <span className='text-sm'>or use your account</span>
              </div>
              
              {error && (
                <div className='bg-red-500/10 border border-red-500/50 rounded-md px-4 py-2 text-red-400 text-sm'>
                  {error}
                </div>
              )}

              <div className='grid gap-4 items-center'>
                  <AppInput 
                    placeholder="Username" 
                    type="text" 
                    value={formData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, username: e.target.value})}
                    required
                    disabled={isLoading}
                  />
                  <AppInput 
                    placeholder="Password" 
                    type="password" 
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, password: e.target.value})}
                    required
                    disabled={isLoading}
                  />
                </div>
                <a href="#" className='font-light text-sm md:text-md'>Forgot your password?</a>
                <div className='flex gap-4 justify-center items-center'>
                   <button 
                    type="submit"
                    disabled={isLoading}
                    className="group/button relative inline-flex justify-center items-center overflow-hidden rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-xs font-normal text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                  <span className="text-sm px-2 py-1">
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </span>
                  {!isLoading && (
                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                      <div className="relative h-full w-8 bg-white/20" />
                    </div>
                  )}
                </button>
                </div>
                <a href="/signup" className='font-light text-sm md:text-md mt-2'>Don&apos;t have an account? <span className='text-emerald-400 hover:text-emerald-300 transition-colors'>Sign up</span></a>
              </form>
            </div>
          </div>
          <div className='hidden lg:block w-1/2 right h-full overflow-hidden rounded-r-lg'>
              <Image
                src='https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1000&h=1000&fit=crop'
                loader={({ src }) => src}
                width={1000}
                height={1000}
                priority
                alt="Cybersecurity background"
                className="w-full h-full object-cover transition-transform duration-300 opacity-30"
              />
         </div>
        </div>
      </div>
  )
}

export default LoginComponent
