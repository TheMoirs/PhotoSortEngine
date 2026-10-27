# PhotoSortEngine

Browse photos in Google Drive or OneDrive and sort them into year folders.

## Running locally (Windows, Mac or Linux)

You need Node.js 20.12 or newer.

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in (see the two sign-in sections below).
3. `npm run dev`
4. Open http://localhost:5000

The app reads `.env` automatically when it starts.

## Setting up Google Drive sign-in

You do this once, in the Google Cloud Console (https://console.cloud.google.com), signed in with your Google account.

1. **Create a project.** Use the project picker at the top, choose **New project**, and call it something like `PhotoSortEngine`.
2. **Turn on the Drive API.** Go to **APIs & Services → Library**, search for **Google Drive API**, and click **Enable**.
3. **Set up the consent screen.** Go to **Google Auth Platform** (also listed as *OAuth consent screen*) and click **Get started**:
   - App name: `PhotoSortEngine`, plus your email as the support email.
   - Audience: **External**.
   - Finish the wizard.
4. **Add yourself as a test user.** Under **Audience → Test users**, add every Google account that will use the app.
5. **Create the login credentials.** Go to **Clients → Create client**:
   - Application type: **Web application**.
   - Under **Authorised redirect URIs**, add both:
     - `http://localhost:5000/auth/google/callback`
     - `https://YOUR-RENDER-URL/auth/google/callback`
   - Click **Create**, then copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

> While the app is in **Testing** mode, Google asks you to sign in again every 7 days. That's expected for a personal app. Publishing the app removes the limit, but Google then requires a security review because the app can access all of Drive.

## Setting up OneDrive sign-in

You do this once, in the Azure portal (https://portal.azure.com) under **Microsoft Entra ID**. If you only have a personal Microsoft account, Microsoft may ask you to create a free Azure account first.

1. **Register the app.** Go to **App registrations → New registration**:
   - Name: `PhotoSortEngine`.
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
   - Redirect URI: platform **Web**, address `http://localhost:5000/auth/microsoft/callback`.
   - Click **Register**.
2. **Copy the client ID.** On the app's **Overview** page, copy the **Application (client) ID** into `MICROSOFT_CLIENT_ID`.
3. **Add the Render address.** Go to **Authentication**, and under *Web → Redirect URIs* add `https://YOUR-RENDER-URL/auth/microsoft/callback`. Click **Save**.
4. **Create a secret.** Go to **Certificates & secrets → New client secret**, then copy the **Value** (not the Secret ID) into `MICROSOFT_CLIENT_SECRET`.
   - Secrets expire. When yours does, make a new one and update the setting.
5. **Check permissions.** Under **API permissions**, make sure Microsoft Graph has the *Delegated* permissions `Files.ReadWrite`, `User.Read` and `offline_access`. They are also requested when you sign in.

## Deploying to Render

Create a **Web Service** from this GitHub repo with these settings:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables: everything from `.env.example`, with `APP_URL` set to your Render address (for example `https://photosortengine.onrender.com`).

Sign-ins are kept in memory. When Render's free tier puts the app to sleep, or after a redeploy, you'll need to sign in again.
