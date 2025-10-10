// auth.js - Complete authentication system for SpellRightPro
(function() {
  'use strict';

  let auth;
  try {
    auth = firebase.auth();
  } catch (error) {
    console.error('Firebase Auth not available:', error);
    return;
  }

  // Rate limiting utility
  const authLimiter = {
    attempts: 0,
    lastAttempt: 0,
    check() {
      const now = Date.now();
      if (now - this.lastAttempt < 2000) { // 2 second minimum between attempts
        throw new Error('Please wait a moment before trying again');
      }
      this.attempts++;
      this.lastAttempt = now;
      
      if (this.attempts > 5) {
        throw new Error('Too many attempts. Please try again later.');
      }
    },
    reset() {
      this.attempts = 0;
      this.lastAttempt = 0;
    }
  };

  async function loginUser(email, password) {
    try {
      authLimiter.check();
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      authLimiter.reset();
      
      if (window.SpellRightAnalytics) {
        window.SpellRightAnalytics.trackEvent('login_success', 'auth', email);
      }
      
      return userCredential.user;
    } catch (error) {
      if (window.SpellRightAnalytics) {
        window.SpellRightAnalytics.trackEvent('login_failed', 'auth', error.code);
      }
      throw new Error(getAuthErrorMessage(error));
    }
  }

  async function registerUser(email, password, displayName = '') {
    try {
      authLimiter.check();
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      if (displayName) {
        await userCredential.user.updateProfile({ displayName });
      }
      
      authLimiter.reset();
      
      if (window.SpellRightAnalytics) {
        window.SpellRightAnalytics.trackEvent('register_success', 'auth', email);
      }
      
      return userCredential.user;
    } catch (error) {
      if (window.SpellRightAnalytics) {
        window.SpellRightAnalytics.trackEvent('register_failed', 'auth', error.code);
      }
      throw new Error(getAuthErrorMessage(error));
    }
  }

  async function logoutUser() {
    try {
      await auth.signOut();
      if (window.SpellRightAnalytics) {
        window.SpellRightAnalytics.trackEvent('logout', 'auth');
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async function resetPassword(email) {
    try {
      await auth.sendPasswordResetEmail(email);
      if (window.SpellRightAnalytics) {
        window.SpellRightAnalytics.trackEvent('password_reset_requested', 'auth', email);
      }
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  function getAuthErrorMessage(error) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again in a few minutes';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'Authentication failed. Please try again';
    }
  }

  function getCurrentUser() {
    return auth.currentUser;
  }

  function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  }

  function setupAuthUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = getCurrentUser();
    
    if (user) {
      container.innerHTML = `
        <div class="auth-status" style="text-align: center; padding: 20px;">
          <div style="font-size: 1.2rem; color: #4cc9f0; margin-bottom: 10px;">
            <i class="fas fa-check-circle"></i> Welcome, ${user.email}!
          </div>
          <div style="color: #666; margin-bottom: 20px;">
            Premium features unlocked ✅
          </div>
          <button class="btn btn-secondary" onclick="SpellRightAuth.logout()">
            <i class="fas fa-sign-out-alt"></i> Sign Out
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="auth-form" style="max-width: 400px; margin: 0 auto;">
          <h3 style="text-align: center; margin-bottom: 20px; color: #4361ee;">
            <i class="fas fa-crown"></i> Premium Access
          </h3>
          <form id="loginForm" onsubmit="return SpellRightAuth.handleLogin(event)">
            <div style="margin-bottom: 15px;">
              <input type="email" id="authEmail" placeholder="Email Address" required 
                     style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 1rem;">
            </div>
            <div style="margin-bottom: 20px;">
              <input type="password" id="authPassword" placeholder="Password" required 
                     style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 1rem;">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">
              <i class="fas fa-lock"></i> Sign In to Premium
            </button>
          </form>
          <div style="text-align: center; margin-top: 15px;">
            <a href="#" onclick="SpellRightAuth.showResetPassword()" style="color: #4361ee; text-decoration: none;">
              Forgot password?
            </a>
          </div>
        </div>
      `;
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    try {
      if (window.SpellRightCommon) {
        window.SpellRightCommon.showLoader();
      }
      
      await loginUser(email, password);
      
      if (window.SpellRightCommon) {
        window.SpellRightCommon.showAlert('Successfully signed in!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      if (window.SpellRightCommon) {
        window.SpellRightCommon.showAlert(error.message, 'error');
      }
    } finally {
      if (window.SpellRightCommon) {
        window.SpellRightCommon.hideLoader();
      }
    }
  }

  async function logout() {
    try {
      await logoutUser();
      if (window.SpellRightCommon) {
        window.SpellRightCommon.showAlert('Signed out successfully', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      if (window.SpellRightCommon) {
        window.SpellRightCommon.showAlert('Error signing out', 'error');
      }
    }
  }

  // Export to global scope
  window.SpellRightAuth = {
    login: loginUser,
    register: registerUser,
    logout,
    resetPassword,
    getCurrentUser,
    onAuthStateChanged,
    setupAuthUI,
    handleLogin,
    getAuthErrorMessage
  };

  console.log('✅ Authentication system loaded');
})();
