(() => {
  "use strict";

  const supabase = window.planoraSupabase;
  const CONFIG = window.PLANORA_CONFIG || {};
  const app = window.PlanoraApp;
  const $ = id => document.getElementById(id);

  const els = {
    bootScreen: $("bootScreen"),
    authScreen: $("authScreen"),
    appScreen: $("appScreen"),
    authDefaultView: $("authDefaultView"),
    authMessageView: $("authMessageView"),
    forgotPasswordForm: $("forgotPasswordForm"),
    recoveryForm: $("recoveryForm"),
    signInTab: $("signInTab"),
    registerTab: $("registerTab"),
    signInForm: $("signInForm"),
    registerForm: $("registerForm"),
    signInEmail: $("signInEmail"),
    signInPassword: $("signInPassword"),
    rememberEmail: $("rememberEmail"),
    signInButton: $("signInButton"),
    registerName: $("registerName"),
    registerEmail: $("registerEmail"),
    registerPassword: $("registerPassword"),
    registerButton: $("registerButton"),
    acceptTerms: $("acceptTerms"),
    passwordMeterFill: $("passwordMeterFill"),
    passwordHint: $("passwordHint"),
    forgotPasswordButton: $("forgotPasswordButton"),
    forgotEmail: $("forgotEmail"),
    sendResetButton: $("sendResetButton"),
    cancelForgotButton: $("cancelForgotButton"),
    recoveryPassword: $("recoveryPassword"),
    recoveryPasswordConfirm: $("recoveryPasswordConfirm"),
    updatePasswordButton: $("updatePasswordButton"),
    backToSignInButton: $("backToSignInButton"),
    authMessageIcon: $("authMessageIcon"),
    authMessageEyebrow: $("authMessageEyebrow"),
    authMessageTitle: $("authMessageTitle"),
    authMessageBody: $("authMessageBody")
  };

  let authBusy = false;
  let recoveryMode = false;
  let lastSessionUserId = null;

  document.addEventListener("DOMContentLoaded", initializeAuth);

  async function initializeAuth() {
    updateVersionLabels();
    setupControls();
    restoreRememberedEmail();
    recoveryMode = isRecoveryRedirect();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Set this immediately so the initial getSession() call cannot open the
      // planner before the recovery event is processed.
      if (event === "PASSWORD_RECOVERY") recoveryMode = true;
      window.setTimeout(() => processAuthEvent(event, session), 0);
    });
    window.addEventListener("beforeunload", () => authListener.subscription.unsubscribe(), { once: true });

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (recoveryMode) {
        showRecoveryScreen();
      } else if (data.session) {
        await enterApp(data.session);
      } else {
        showAuthScreen("signin");
      }
    } catch (error) {
      console.error(error);
      showAuthScreen("signin");
      app.showToast(readableError(error), "error");
    } finally {
      els.bootScreen.classList.add("hidden");
    }
  }

  function setupControls() {
    els.signInTab.addEventListener("click", () => switchAuthTab("signin"));
    els.registerTab.addEventListener("click", () => switchAuthTab("register"));
    els.signInForm.addEventListener("submit", signIn);
    els.registerForm.addEventListener("submit", register);
    els.forgotPasswordButton.addEventListener("click", openForgotPassword);
    els.forgotPasswordForm.addEventListener("submit", sendPasswordReset);
    els.cancelForgotButton.addEventListener("click", () => showAuthScreen("signin"));
    els.recoveryForm.addEventListener("submit", updateRecoveredPassword);
    els.backToSignInButton.addEventListener("click", () => showAuthScreen("signin"));
    els.registerPassword.addEventListener("input", updatePasswordMeter);

    document.querySelectorAll("[data-password-target]").forEach(button => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordTarget);
        if (!input) return;
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        button.textContent = showing ? "Show" : "Hide";
        button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      });
    });
  }

  async function processAuthEvent(event, session) {
    const recoverySessionEvent = recoveryMode
      && session
      && ["SIGNED_IN", "INITIAL_SESSION", "PASSWORD_RECOVERY"].includes(event);

    if (event === "PASSWORD_RECOVERY" || recoverySessionEvent) {
      recoveryMode = true;
      lastSessionUserId = session?.user?.id || null;
      await app.stop();
      showRecoveryScreen();
      return;
    }

    if (event === "SIGNED_OUT") {
      recoveryMode = false;
      lastSessionUserId = null;
      await app.stop();
      showAuthScreen("signin");
      return;
    }

    if (["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event) && session && !recoveryMode) {
      await enterApp(session);
    }
  }

  async function enterApp(session) {
    if (!session?.user || recoveryMode) return;
    els.authScreen.classList.add("hidden");
    els.appScreen.classList.remove("hidden");
    lastSessionUserId = session.user.id;
    await app.start(session);
  }

  function showAuthScreen(tab = "signin") {
    recoveryMode = false;
    els.appScreen.classList.add("hidden");
    els.authScreen.classList.remove("hidden");
    els.authDefaultView.classList.remove("hidden");
    els.authMessageView.classList.add("hidden");
    els.forgotPasswordForm.classList.add("hidden");
    els.recoveryForm.classList.add("hidden");
    switchAuthTab(tab);
  }

  function switchAuthTab(tab) {
    const signingIn = tab === "signin";
    els.signInTab.classList.toggle("active", signingIn);
    els.registerTab.classList.toggle("active", !signingIn);
    els.signInForm.classList.toggle("hidden", !signingIn);
    els.registerForm.classList.toggle("hidden", signingIn);
  }

  function openForgotPassword() {
    els.authDefaultView.classList.add("hidden");
    els.authMessageView.classList.add("hidden");
    els.recoveryForm.classList.add("hidden");
    els.forgotPasswordForm.classList.remove("hidden");
    els.forgotEmail.value = els.signInEmail.value.trim();
    requestAnimationFrame(() => els.forgotEmail.focus());
  }

  function showRecoveryScreen() {
    els.appScreen.classList.add("hidden");
    els.authScreen.classList.remove("hidden");
    els.authDefaultView.classList.add("hidden");
    els.authMessageView.classList.add("hidden");
    els.forgotPasswordForm.classList.add("hidden");
    els.recoveryForm.classList.remove("hidden");
    els.recoveryForm.reset();
    requestAnimationFrame(() => els.recoveryPassword.focus());
  }

  function showMessage({ icon = "✓", eyebrow, title, body }) {
    els.authDefaultView.classList.add("hidden");
    els.forgotPasswordForm.classList.add("hidden");
    els.recoveryForm.classList.add("hidden");
    els.authMessageView.classList.remove("hidden");
    els.authMessageIcon.textContent = icon;
    els.authMessageEyebrow.textContent = eyebrow;
    els.authMessageTitle.textContent = title;
    els.authMessageBody.textContent = body;
  }

  async function signIn(event) {
    event.preventDefault();
    if (authBusy) return;
    const email = els.signInEmail.value.trim().toLowerCase();
    const password = els.signInPassword.value;
    if (!email || !password) return;

    setAuthBusy(true, els.signInButton, "Signing in…");
    try {
      if (els.rememberEmail.checked) localStorage.setItem("planora-remembered-email", email);
      else localStorage.removeItem("planora-remembered-email");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) await enterApp(data.session);
    } catch (error) {
      app.showToast(readableError(error), "error");
    } finally {
      setAuthBusy(false, els.signInButton, "Sign in");
    }
  }

  async function register(event) {
    event.preventDefault();
    if (authBusy) return;
    const fullName = els.registerName.value.trim();
    const email = els.registerEmail.value.trim().toLowerCase();
    const password = els.registerPassword.value;

    if (!fullName || !email || password.length < 8 || !els.acceptTerms.checked) {
      app.showToast("Complete the registration form and use a password with at least 8 characters.", "error");
      return;
    }

    setAuthBusy(true, els.registerButton, "Creating account…");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: getRedirectUrl()
        }
      });
      if (error) throw error;

      if (data.session) {
        await enterApp(data.session);
      } else {
        showMessage({
          eyebrow: "Check your inbox",
          title: "Confirm your email",
          body: `We sent a confirmation link to ${email}. Open it to activate your Planora workspace.`
        });
      }
    } catch (error) {
      app.showToast(readableError(error), "error");
    } finally {
      setAuthBusy(false, els.registerButton, "Create free account");
    }
  }

  async function sendPasswordReset(event) {
    event.preventDefault();
    if (authBusy) return;
    const email = els.forgotEmail.value.trim().toLowerCase();
    if (!email) return;

    setAuthBusy(true, els.sendResetButton, "Sending…");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrl("recovery")
      });
      if (error) throw error;
      showMessage({
        eyebrow: "Reset link sent",
        title: "Check your email",
        body: `A password-reset link was sent to ${email}. The link will return you to Planora to choose a new password.`
      });
    } catch (error) {
      app.showToast(readableError(error), "error");
    } finally {
      setAuthBusy(false, els.sendResetButton, "Send reset link");
    }
  }

  async function updateRecoveredPassword(event) {
    event.preventDefault();
    if (authBusy) return;
    const password = els.recoveryPassword.value;
    const confirmation = els.recoveryPasswordConfirm.value;
    if (password.length < 8 || password !== confirmation) {
      app.showToast("Passwords must match and contain at least 8 characters.", "error");
      return;
    }

    setAuthBusy(true, els.updatePasswordButton, "Updating…");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      recoveryMode = false;
      clearRecoveryRedirect();
      app.showToast("Password updated successfully.", "success");
      const { data } = await supabase.auth.getSession();
      if (data.session) await enterApp(data.session);
      else showAuthScreen("signin");
    } catch (error) {
      app.showToast(readableError(error), "error");
    } finally {
      setAuthBusy(false, els.updatePasswordButton, "Update password");
    }
  }

  function updatePasswordMeter() {
    const password = els.registerPassword.value;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    const width = Math.min(score * 20, 100);
    els.passwordMeterFill.style.width = `${width}%`;
    els.passwordMeterFill.style.background = score <= 2 ? "#dc4a5c" : score <= 3 ? "#d29a17" : "#1f9d6a";
    els.passwordHint.textContent = score <= 2
      ? "Use at least 8 characters with a mix of letters and numbers."
      : score <= 3
        ? "Good password. Add length or a symbol to make it stronger."
        : "Strong password.";
  }

  function restoreRememberedEmail() {
    const email = localStorage.getItem("planora-remembered-email");
    if (!email) return;
    els.signInEmail.value = email;
    els.rememberEmail.checked = true;
  }

  function getRedirectUrl(mode = "default") {
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const baseUrl = isLocal
      ? `${window.location.origin}${window.location.pathname}`
      : CONFIG.SITE_URL;
    const url = new URL(baseUrl, window.location.origin);

    if (mode === "recovery") {
      url.searchParams.set("mode", "recovery");
    }

    return url.toString();
  }

  function isRecoveryRedirect() {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return query.get("mode") === "recovery"
      || query.get("type") === "recovery"
      || hash.get("type") === "recovery";
  }

  function clearRecoveryRedirect() {
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    url.searchParams.delete("type");
    url.searchParams.delete("code");
    url.hash = "";
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }

  function setAuthBusy(value, button, label) {
    authBusy = value;
    button.disabled = value;
    button.textContent = label;
  }

  function updateVersionLabels() {
    document.querySelectorAll("[data-app-version]").forEach(element => {
      element.textContent = CONFIG.VERSION || "0.1.0";
    });
  }

  function readableError(error) {
    const message = error?.message || String(error || "Authentication failed.");
    if (/invalid login credentials/i.test(message)) return "The email or password is incorrect.";
    if (/email not confirmed/i.test(message)) return "Confirm your email before signing in.";
    if (/user already registered/i.test(message)) return "An account already exists for this email.";
    if (/password should be/i.test(message)) return "Use a stronger password with at least 8 characters.";
    if (/rate limit/i.test(message)) return "Too many attempts. Wait a moment and try again.";
    if (/network|fetch/i.test(message)) return "Could not reach Supabase. Check your internet connection.";
    return message;
  }
})();
