import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppConfig, DEFAULT_CONFIG_PATH, DEFAULT_OAUTH_PATH } from '../types/index.js';

function expandHome(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

export function loadConfig(configPath: string = DEFAULT_CONFIG_PATH): AppConfig {
  const resolved = expandHome(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Config not found at ${resolved}. Run 'auto-settle auth' to get started.`
    );
  }
  const raw = fs.readFileSync(resolved, 'utf-8');
  return JSON.parse(raw) as AppConfig;
}

export function saveConfig(config: AppConfig, configPath: string = DEFAULT_CONFIG_PATH): void {
  const resolved = expandHome(configPath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, JSON.stringify(config, null, 2));
}

export function loadOAuth(oauthPath: string = DEFAULT_OAUTH_PATH): Record<string, string> | null {
  const resolved = expandHome(oauthPath);
  if (!fs.existsSync(resolved)) return null;
  const raw = fs.readFileSync(resolved, 'utf-8');
  return JSON.parse(raw);
}

export function saveOAuth(tokens: Record<string, string>, oauthPath: string = DEFAULT_OAUTH_PATH): void {
  const resolved = expandHome(oauthPath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, JSON.stringify(tokens, null, 2));
}