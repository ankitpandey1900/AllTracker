export const authModal = `
  <style>
    .auth-modal-shell {
      padding: 48px 40px;
      text-align: center;
      background: rgba(13, 17, 23, 0.85); /* Deep dark space UI */
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 28px;
      max-width: 440px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 40px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(59, 130, 246, 0.1);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    /* Subtle neon accent glow at the top edge */
    .auth-modal-shell::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.6), rgba(167, 139, 250, 0.6), transparent);
    }

    .auth-modal-title {
      font-size: 2.1rem;
      font-weight: 900;
      letter-spacing: -0.04em;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .auth-provider-copy {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 40px;
      font-weight: 400;
    }

    .auth-provider-stack {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .auth-provider-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 16px 20px;
      font-weight: 600;
      font-size: 1.05rem;
      border-radius: 16px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    /* Glassmorphism Buttons matching the dark sci-fi aesthetic */
    .auth-provider-google, .auth-provider-github {
      background: rgba(255, 255, 255, 0.03);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
    
    .auth-provider-google:hover, .auth-provider-github:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .modal-close-new {
      position: absolute;
      right: 24px;
      top: 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.4);
      font-size: 1.2rem;
      cursor: pointer;
      transition: all 0.2s ease;
      z-index: 10;
    }
    
    .modal-close-new:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      transform: scale(1.05) rotate(90deg);
    }
  </style>

  <div class="modal" id="authModal">
    <div class="modal-content auth-modal-shell">
      <button id="closeAuthModal" class="modal-close-new">&times;</button>
      
      <div class="modal-header auth-modal-header" style="justify-content: center; margin-bottom: 4px;">
        <h2 class="auth-modal-title">Enter the Arena</h2>
      </div>

      <div class="modal-body auth-provider-stack">
        <p class="auth-provider-copy">
          Synchronize your progress, climb the World Stage, and immortalize your routines securely in the cloud.
        </p>

        <button id="loginWithGoogleBtn" class="auth-provider-btn auth-provider-google" type="button">
          <svg width="24" height="24" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <button id="loginWithGithubBtn" class="auth-provider-btn auth-provider-github" type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.42 0 12.11c0 5.35 3.43 9.88 8.2 11.48.6.11.82-.26.82-.58v-2.15c-3.34.73-4.04-1.54-4.04-1.54-.54-1.4-1.33-1.77-1.33-1.77-1.09-.76.08-.74.08-.74 1.2.09 1.83 1.25 1.83 1.25 1.07 1.84 2.81 1.31 3.5.1.11-.78.41-1.31.74-1.61-2.67-.3-5.47-1.35-5.47-5.99 0-1.32.47-2.4 1.23-3.25-.12-.3-.54-1.54.12-3.2 0 0 1-.33 3.3 1.26A11.3 11.3 0 0 1 12 5.92a11.5 11.5 0 0 1 3.01.41c2.3-1.59 3.3-1.26 3.3-1.26.66 1.66.24 2.9.12 3.2.77.85 1.23 1.93 1.23 3.25 0 4.65-2.8 5.68-5.48 5.98.42.37.8 1.1.8 2.22v3.3c0 .32.22.7.82.58A12.1 12.1 0 0 0 24 12.11C24 5.42 18.63 0 12 0z"/>
          </svg>
          <span>Continue with GitHub</span>
        </button>

        <div id="authErrorMsg" class="auth-error-msg" style="display:none; color: #ef4444; margin-top: 16px; font-weight: 500;"></div>
      </div>
    </div>
  </div>
`;
