const CLIENT_ID    = "2255dc00-cc5f-4140-8609-7b445cc11958";
  const REDIRECT_URI = "https://msf-roster.pages.dev/callback";
  const TOKEN_URL    = "https://hydra-public.prod.m3.scopelypv.com/oauth2/token";
  const APP_URL      = "https://msf-roster.pages.dev/index.html";

  function setSuccess() {
    document.getElementById("icon").className = "icon success";
    document.getElementById("spinner").style.display = "none";
    document.getElementById("check-icon").style.display = "block";
    document.getElementById("title").textContent = "Connected!";
    document.getElementById("message").textContent = "Your MSF account is linked. Redirecting to the app...";
    document.getElementById("go-btn").style.display = "inline-block";
    setTimeout(goToApp, 2000);
  }

  function setError(reason) {
    document.getElementById("icon").className = "icon error";
    document.getElementById("spinner").style.display = "none";
    document.getElementById("error-icon").style.display = "block";
    document.getElementById("title").textContent = "Connection failed";
    document.getElementById("message").textContent = "Something went wrong during login. You can go back and try again.";
    const detail = document.getElementById("error-detail");
    detail.textContent = reason || "Unknown error";
    detail.style.display = "block";
    const btn = document.getElementById("go-btn");
    btn.textContent = "Back to app";
    btn.style.display = "inline-block";
  }

  function goToApp() { window.location.href = APP_URL; }

  async function exchangeCodePKCE(code) {
    const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
    if (!codeVerifier) {
      setError("PKCE code verifier not found. Please try signing in again.");
      return;
    }
    try {
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type:    "authorization_code",
          client_id:     CLIENT_ID,
          redirect_uri:  REDIRECT_URI,
          code,
          code_verifier: codeVerifier
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.error || "Token exchange failed (HTTP " + res.status + ")");
      if (!data.access_token) throw new Error("No access token in response");
      sessionStorage.setItem("msf_token", data.access_token);
      sessionStorage.removeItem("pkce_code_verifier");
      sessionStorage.removeItem("pkce_state");
      setSuccess();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);

    const error = params.get("error");
    if (error) { setError(params.get("error_description") || error); return; }

    const returnedState = params.get("state");
    const savedState    = sessionStorage.getItem("pkce_state");
    if (returnedState && savedState && returnedState !== savedState) {
      setError("State mismatch — please try signing in again.");
      return;
    }

    const code = params.get("code");
    if (code) {
      document.getElementById("message").textContent = "Authorization received. Exchanging for access token...";
      await exchangeCodePKCE(code);
      return;
    }

    // Implicit flow fallback
    const hash  = new URLSearchParams(window.location.hash.replace("#", ""));
    const token = hash.get("access_token");
    if (token) { sessionStorage.setItem("msf_token", token); setSuccess(); return; }

    setError("No authorization code or token found in the redirect. Please try signing in again.");
  }

  handleCallback();


document.addEventListener("DOMContentLoaded", function() {
  const goBtn = document.getElementById("go-btn");
  if (goBtn) goBtn.addEventListener("click", goToApp);
});