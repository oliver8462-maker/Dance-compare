# Google Authentication Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add Google Sign-In capability utilizing Firebase's popup authentication.

**Architecture:** Inject a button in index.html, add glass-compatible branding styles in style.css, and integrate GoogleAuthProvider and signInWithPopup in app.js.

**Tech Stack:** HTML5, CSS3, Firebase Auth, JavaScript ES Modules.

---

### Task 1: Add Google Button in index.html

**Files:**
- Modify: `c:/Users/kenwu/Downloads/Dance-compare-main/index.html`

**Step 1: Add Google Login Button**
Insert the Google sign-in button after the registration link and before the divider inside the `#auth-overlay` auth card.

Code to add:
```html
                <button id="google-login-btn" class="btn btn-google">
                    <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
                        <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.9-2.7 3.4-4.51 6.76-4.51z"/>
                        <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.85c2.25-2.07 3.58-5.13 3.58-8.73z"/>
                        <path fill="#FBBC05" d="M5.24 10.55c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.39 3.16C.5 4.93 0 6.9 0 9s.5 4.07 1.39 5.84l3.85-2.99.01.7z"/>
                        <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.85-2.98c-1.1.74-2.5 1.18-4.11 1.18-3.36 0-5.86-1.81-6.76-4.51L1.39 14.7C3.37 18.59 7.35 21 12 23z"/>
                    </svg>
                    使用 Google 帳號登入
                </button>
```

---

### Task 2: Add CSS for Google button in style.css

**Files:**
- Modify: `c:/Users/kenwu/Downloads/Dance-compare-main/style.css`

**Step 1: Add Button Styles**
Add styling for `.btn-google` and `.google-icon` at the end of `style.css`.

Code to add:
```css
/* Google Sign-in Button Styles */
.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 0.85rem 1.5rem;
  font-size: 0.95rem;
  border-radius: 14px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #ffffff;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.2rem;
}

.btn-google:hover {
  background: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
}

.google-icon {
  display: block;
}
```

---

### Task 3: Refactor app.js to support Google Sign-In

**Files:**
- Modify: `c:/Users/kenwu/Downloads/Dance-compare-main/app.js`

**Step 1: Update imports from Firebase Auth**
Modify the import statement to include `GoogleAuthProvider` and `signInWithPopup`.

```javascript
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
```

**Step 2: Add Google Login Handler**
Modify `setupAuthListeners()` to listen to clicks on `#google-login-btn` and trigger the Google sign-in flow.

```javascript
  const googleLoginBtn = document.getElementById('google-login-btn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      const provider = new GoogleAuthProvider();
      try {
        hideAuthError();
        googleLoginBtn.disabled = true;
        googleLoginBtn.textContent = '登入中...';
        
        await signInWithPopup(auth, provider);
        authOverlay.classList.add('hidden');
      } catch (error) {
        showAuthError(getFirebaseErrorMessage(error.code));
      } finally {
        googleLoginBtn.disabled = false;
        googleLoginBtn.innerHTML = `
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.9-2.7 3.4-4.51 6.76-4.51z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.85c2.25-2.07 3.58-5.13 3.58-8.73z"/>
            <path fill="#FBBC05" d="M5.24 10.55c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.39 3.16C.5 4.93 0 6.9 0 9s.5 4.07 1.39 5.84l3.85-2.99.01.7z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.85-2.98c-1.1.74-2.5 1.18-4.11 1.18-3.36 0-5.86-1.81-6.76-4.51L1.39 14.7C3.37 18.59 7.35 21 12 23z"/>
          </svg>
          使用 Google 帳號登入
        `;
      }
    });
  }
```

---

### Task 4: Run Verification

**Step 1: Run math unit tests**
Run: `node tests/math.test.js`
Expected: All math tests passed successfully!

**Step 2: Start server**
Run: `npm run dev` or `npx http-server -p 8080 -c-1`
Verify popup login triggers properly and user session registers correctly.
