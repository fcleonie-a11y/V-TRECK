import { auth, isFirebaseConfigured } from "./firebase.js";
import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { createUserFoundation } from "./data.js";

const forms = {
  login: document.querySelector("#login-form"),
  register: document.querySelector("#register-form"),
  forgot: document.querySelector("#forgot-form")
};
const message = document.querySelector("#auth-message");
const title = document.querySelector("#auth-title");
const subtitle = document.querySelector("#auth-subtitle");

if (!isFirebaseConfigured) {
  showMessage("Firebase ist noch nicht konfiguriert. Trage zuerst deine Web-App-Werte in js/firebase-config.js ein.", true);
  Object.values(forms).forEach(form => form.querySelector('button[type="submit"]').disabled = true);
} else {
  onAuthStateChanged(auth, user => {
    if (user) window.location.replace("dashboard.html");
  });
}

document.querySelectorAll("[data-auth-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.authView)));
document.querySelectorAll(".reveal").forEach(button => button.addEventListener("click", () => {
  const input = button.previousElementSibling;
  input.type = input.type === "password" ? "text" : "password";
  button.textContent = input.type === "password" ? "Anzeigen" : "Verbergen";
}));

forms.login.addEventListener("submit", async event => {
  event.preventDefault();
  await submit(event.currentTarget, async data => {
    await signInWithEmailAndPassword(auth, data.get("email"), data.get("password"));
  });
});

forms.register.addEventListener("submit", async event => {
  event.preventDefault();
  await submit(event.currentTarget, async data => {
    const credential = await createUserWithEmailAndPassword(auth, data.get("email"), data.get("password"));
    await updateProfile(credential.user, { displayName: data.get("displayName") });
    await createUserFoundation(credential.user.uid, { displayName: data.get("displayName"), email: data.get("email") });
  });
});

forms.forgot.addEventListener("submit", async event => {
  event.preventDefault();
  await submit(event.currentTarget, async data => {
    await sendPasswordResetEmail(auth, data.get("email"));
    showMessage("Der Link zum Zurücksetzen wurde versendet.");
  }, false);
});

function showView(view) {
  Object.entries(forms).forEach(([name, form]) => form.hidden = name !== view);
  const copy = {
    login: ["Einloggen", "Melde dich an und behalte deinen Fortschritt im Blick."],
    register: ["Konto erstellen", "Starte deinen persönlichen V-Track."],
    forgot: ["Passwort zurücksetzen", "Wir senden dir einen sicheren Reset-Link."]
  };
  [title.textContent, subtitle.textContent] = copy[view];
  message.hidden = true;
}

async function submit(form, action, redirect = true) {
  const button = form.querySelector('button[type="submit"]');
  const oldText = button.textContent;
  button.disabled = true; button.textContent = "Bitte warten…"; message.hidden = true;
  try {
    await action(new FormData(form));
    if (redirect) window.location.replace("dashboard.html");
  } catch (error) {
    showMessage(authError(error.code), true);
  } finally {
    button.disabled = false; button.textContent = oldText;
  }
}

function showMessage(text, error = false) {
  message.textContent = text; message.hidden = false; message.classList.toggle("error", error);
}

function authError(code = "") {
  const errors = {
    "auth/invalid-credential": "E-Mail-Adresse oder Passwort ist nicht korrekt.",
    "auth/email-already-in-use": "Für diese E-Mail-Adresse besteht bereits ein Konto.",
    "auth/weak-password": "Das Passwort muss mindestens 6 Zeichen lang sein.",
    "auth/invalid-email": "Bitte gib eine gültige E-Mail-Adresse ein.",
    "auth/too-many-requests": "Zu viele Versuche. Bitte probiere es später erneut."
  };
  return errors[code] || "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
}
