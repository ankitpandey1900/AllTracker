export const authModal = `
  <style>
    /* Full-screen backdrop overlay for the modal */
    .modal#authModal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(5, 5, 10, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.4s ease, backdrop-filter 0.4s ease;
    }
    
    .modal#authModal.active {
      display: flex;
      opacity: 1;
    }

    /* Modal Shell Container */
    .auth-modal-shell {
      position: relative;
      display: flex;
      flex-direction: row;
      width: 100%;
      max-width: 850px;
      min-height: 500px;
      background: rgba(13, 17, 23, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.8), 
                  0 0 40px rgba(59, 130, 246, 0.15),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transform: scale(0.95) translateY(20px);
      opacity: 0;
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
    }

    .modal#authModal.active .auth-modal-shell {
      transform: scale(1) translateY(0);
      opacity: 1;
    }

    /* Left Side: Aesthetic Visual */
    .auth-visual-panel {
      flex: 1;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 40px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 25, 0.95));
      overflow: hidden;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* Abstract Glowing Orbs */
    .auth-visual-panel::before {
      content: '';
      position: absolute;
      top: -20%; left: -20%;
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%);
      border-radius: 50%;
      filter: blur(40px);
      animation: float-orb 10s ease-in-out infinite alternate;
    }
    
    .auth-visual-panel::after {
      content: '';
      position: absolute;
      bottom: -10%; right: -10%;
      width: 250px; height: 250px;
      background: radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%);
      border-radius: 50%;
      filter: blur(40px);
      animation: float-orb 8s ease-in-out infinite alternate-reverse;
    }

    @keyframes float-orb {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(20px, 30px) scale(1.1); }
    }

    .auth-brand-title {
      font-size: 2.8rem;
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: -0.04em;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      z-index: 1;
    }

    .auth-brand-subtitle {
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.05rem;
      line-height: 1.6;
      font-weight: 400;
      z-index: 1;
      max-width: 90%;
    }

    /* Right Side: Login Controls */
    .auth-login-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 48px 56px;
      background: rgba(5, 5, 10, 0.4);
      position: relative;
    }

    /* Close Button */
    .modal-close-new {
      position: absolute;
      right: 24px;
      top: 24px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 1.2rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 10;
    }
    
    .modal-close-new:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      transform: scale(1.1) rotate(90deg);
    }

    .auth-login-header {
      margin-bottom: 32px;
    }

    .auth-login-title {
      font-size: 1.8rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }

    .auth-login-subtitle {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.95rem;
    }

    .auth-provider-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .auth-provider-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 16px;
      font-weight: 600;
      font-size: 1.05rem;
      border-radius: 16px;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: #f1f5f9;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .auth-provider-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
      transform: translateX(-100%);
      transition: transform 0.5s ease;
    }

    .auth-provider-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.4);
    }
    
    .auth-provider-btn:hover::before {
      transform: translateX(100%);
    }

    .auth-divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 24px 0;
      color: rgba(255,255,255,0.3);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .auth-divider::before, .auth-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .auth-divider::before { margin-right: 12px; }
    .auth-divider::after { margin-left: 12px; }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .auth-modal-shell {
        flex-direction: column;
        max-width: 400px;
        min-height: auto;
      }
      .auth-visual-panel {
        padding: 32px 24px;
        text-align: center;
        border-right: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      .auth-login-panel {
        padding: 32px 24px;
      }
      .auth-brand-title { font-size: 2.2rem; }
      .auth-brand-subtitle { max-width: 100%; font-size: 0.95rem; }
    }
  </style>

  <div class="modal" id="authModal">
    <div class="auth-modal-shell">
      <button id="closeAuthModal" class="modal-close-new" aria-label="Close">&times;</button>
      
      <div class="auth-visual-panel">
        <h2 class="auth-brand-title">Synchronize<br>Your Focus.</h2>
        <p class="auth-brand-subtitle">
          Connect your account to save your progress, unlock advanced analytics, and climb the leaderboard across all devices.
        </p>
      </div>

      <div class="auth-login-panel">
        <div class="auth-login-header">
          <h3 class="auth-login-title">Welcome Back</h3>
          <p class="auth-login-subtitle">Choose a provider to continue</p>
        </div>

        <div class="auth-provider-stack">
          <button id="loginWithGoogleBtn" class="auth-provider-btn" type="button">
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button id="loginWithGithubBtn" class="auth-provider-btn" type="button">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.42 0 12.11c0 5.35 3.43 9.88 8.2 11.48.6.11.82-.26.82-.58v-2.15c-3.34.73-4.04-1.54-4.04-1.54-.54-1.4-1.33-1.77-1.33-1.77-1.09-.76.08-.74.08-.74 1.2.09 1.83 1.25 1.83 1.25 1.07 1.84 2.81 1.31 3.5.1.11-.78.41-1.31.74-1.61-2.67-.3-5.47-1.35-5.47-5.99 0-1.32.47-2.4 1.23-3.25-.12-.3-.54-1.54.12-3.2 0 0 1-.33 3.3 1.26A11.3 11.3 0 0 1 12 5.92a11.5 11.5 0 0 1 3.01.41c2.3-1.59 3.3-1.26 3.3-1.26.66 1.66.24 2.9.12 3.2.77.85 1.23 1.93 1.23 3.25 0 4.65-2.8 5.68-5.48 5.98.42.37.8 1.1.8 2.22v3.3c0 .32.22.7.82.58A12.1 12.1 0 0 0 24 12.11C24 5.42 18.63 0 12 0z"/>
            </svg>
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div id="authErrorMsg" class="auth-error-msg" style="display:none; color: #ef4444; margin-top: 16px; font-weight: 500; text-align: center; font-size: 0.9rem;"></div>
      </div>
    </div>
  </div>
`;
