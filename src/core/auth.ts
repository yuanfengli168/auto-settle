import { Splitwise } from 'splitwise';
import { loadConfig, saveConfig, loadOAuth, saveOAuth } from '../config/index.js';
import { createServer } from 'http';
import { exec } from 'child_process';
import os from 'os';

/**
 * Create an authenticated Splitwise client.
 *
 * Flow:
 * 1. If accessToken is stored in oauth.json, use it directly.
 * 2. If consumerKey/secret are in config, use Client Credentials to get a token.
 * 3. Otherwise, prompt user to run `auto-settle auth`.
 */
export async function getSplitwiseClient(configPath?: string): Promise<Splitwise> {
  const config = loadConfig(configPath);
  const oauth = loadOAuth();

  // If we have a cached access token, use it
  if (oauth?.accessToken) {
    return new Splitwise({ accessToken: oauth.accessToken });
  }

  // Use Client Credentials flow
  if (config.splitwise.consumerKey && config.splitwise.consumerSecret) {
    const sw = new Splitwise({
      consumerKey: config.splitwise.consumerKey,
      consumerSecret: config.splitwise.consumerSecret,
    });

    // Get and cache the token
    const token = await sw.getAccessToken();
    saveOAuth({ accessToken: token });

    return sw;
  }

  throw new Error(
    'No Splitwise credentials found. Run "auto-settle auth" to authenticate.'
  );
}

/**
 * OAuth2 Authorization Code with PKCE flow for CLI.
 */
export async function authPKCE(configPath?: string): Promise<void> {
  const config = loadConfig(configPath);

  if (!config.splitwise.consumerKey || !config.splitwise.consumerSecret) {
    console.error('Missing Splitwise consumerKey/consumerSecret in config.');
    console.error('Add them to ~/.auto-settle/config.json:');
    console.error(JSON.stringify({
      splitwise: {
        consumerKey: 'YOUR_CLIENT_ID',
        consumerSecret: 'YOUR_CLIENT_SECRET',
      },
      defaultRecipient: config.defaultRecipient,
      preferences: config.preferences,
    }, null, 2));
    process.exit(1);
  }

  const port = 9876;
  const redirectUri = `http://localhost:${port}/callback`;

  // Step 1: Create the authorization URL
  const auth = await Splitwise.createAuthorizationUrl({
    clientId: config.splitwise.consumerKey,
    redirectUri,
  });

  console.log('\n🔐 Opening browser for Splitwise authorization...\n');
  console.log(`If your browser doesn't open, visit:\n\n${auth.url}\n`);

  // Try to open browser
  const platform = os.platform();
  const openCmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCmd} "${auth.url}"`, (err) => {
    // Ignore errors — we already printed the URL
  });

  // Step 2: Start local server to receive callback
  const sw = await new Promise<Splitwise>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed</h1><p>No code received.</p>');
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        try {
          // Step 3: Exchange code for token
          const client = await Splitwise.fromAuthorizationCode({
            clientId: config.splitwise.consumerKey,
            clientSecret: config.splitwise.consumerSecret,
            code,
            codeVerifier: auth.codeVerifier,
            redirectUri,
          });

          // Get the access token and save it
          const token = await client.getAccessToken();
          saveOAuth({ accessToken: token });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>✅ Authorization successful!</h1><p>You can close this tab and return to your terminal.</p>');

          server.close();
          resolve(client);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authorization failed</h1><p>${err}</p>`);
          server.close();
          reject(err);
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => {
      console.log(`Listening for callback on http://localhost:${port}/callback\n`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out (5 minutes)'));
    }, 5 * 60 * 1000);
  });

  // Verify it works
  const me = await sw.users.getCurrent();
  console.log(`\n✅ Authenticated as ${me.firstName} ${me.lastName || ''} (ID: ${me.id})`);
  console.log('Token saved to ~/.auto-settle/oauth.json\n');
}

/**
 * Client Credentials auth flow — simpler, works for accessing your own data.
 */
export async function authClientCredentials(configPath?: string): Promise<void> {
  const config = loadConfig(configPath);

  if (!config.splitwise.consumerKey || !config.splitwise.consumerSecret) {
    console.error('Missing Splitwise consumerKey/consumerSecret in config.');
    console.error('Get them from https://secure.splitwise.com/apps');
    process.exit(1);
  }

  const sw = new Splitwise({
    consumerKey: config.splitwise.consumerKey,
    consumerSecret: config.splitwise.consumerSecret,
  });

  const token = await sw.getAccessToken();
  saveOAuth({ accessToken: token });

  const me = await sw.users.getCurrent();
  console.log(`\n✅ Authenticated as ${me.firstName} ${me.lastName || ''} (ID: ${me.id})`);
  console.log('Token saved to ~/.auto-settle/oauth.json\n');
}