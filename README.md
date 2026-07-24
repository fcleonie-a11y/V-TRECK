# V-Track – Release

V-Track ist eine Firebase-basierte Valorant-Tracker-Web-App. Matches werden aktuell
manuell erfasst. Das Datenmodell enthält bereits `source`, `externalMatchId` und
`schemaVersion`, damit später ein Riot-API-Import dieselben Dokumente erzeugen kann.

## Veröffentlichung mit GitHub Pages

1. Sämtliche Dateien und Ordner aus diesem Verzeichnis in den Root des
   GitHub-Repositories hochladen.
2. Unter **Settings → Pages** den Branch `main` und den Ordner `/ (root)` wählen.
3. In Firebase unter **Authentication → Settings → Authorized domains** die
   GitHub-Pages-Domain eintragen, zum Beispiel `benutzername.github.io`.
4. In Firebase Authentication muss **E-Mail/Passwort** aktiviert sein.
5. Den Inhalt aus `firestore.rules` in **Firestore Database → Regeln** einsetzen
   und auf **Veröffentlichen** klicken.
6. Die veröffentlichte `https://`-Adresse verwenden. Die App nicht direkt über
   `file://` öffnen, da Browser ES-Module dort blockieren können.

Die Firebase-Webkonfiguration für `vtreck-e5fe8` ist bereits in
`js/firebase-config.js` eingetragen.

## Firestore-Struktur

```text
users/{uid}/profile/current
users/{uid}/settings/current
users/{uid}/statistics/current
users/{uid}/ranked/current
users/{uid}/matches/{matchId}
users/{uid}/roulette/{resultId}
users/{uid}/friends/{friendId}
```

## Firestore-Regeln

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, create, update, delete:
        if request.auth != null && request.auth.uid == userId;

      match /{document=**} {
        allow read, create, update, delete:
          if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```
