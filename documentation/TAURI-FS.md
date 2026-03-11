# Tauri v2 File System Plugin Documentation

## Installation
The plugin is installed via:
```bash
bun tauri add fs
```

## Path Manipulation
Tauri v2 offers two ways to handle paths.

### 1. Base Directory (Recommended)
Most APIs accept a `baseDir` option which acts as the working directory.
```typescript
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';

const contents = await readFile('avatars/tauri.png', {
  baseDir: BaseDirectory.Home,
});
```

### 2. Path API
Use the core path module for complex manipulations.
```typescript
import { readFile } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';

const home = await path.homeDir();
const contents = await readFile(await path.join(home, 'avatars/tauri.png'));
```

## File Operations

### Create
Creates a file (truncates if exists).
```typescript
import { create, BaseDirectory } from '@tauri-apps/plugin-fs';
const file = await create('foo/bar.txt', { baseDir: BaseDirectory.AppData });
await file.write(new TextEncoder().encode('Hello world'));
await file.close();
```

### Write
```typescript
// Text
import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
await writeTextFile('config.json', content, { baseDir: BaseDirectory.AppConfig });

// Binary
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
await writeFile('config', byteData, { baseDir: BaseDirectory.AppConfig });
```

### Read
```typescript
// Text
import { readTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
const text = await readTextFile('config.toml', { baseDir: BaseDirectory.AppConfig });

// Binary
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';
const data = await readFile('icon.png', { baseDir: BaseDirectory.Resources });
```

### Rename
```typescript
import { rename, BaseDirectory } from '@tauri-apps/plugin-fs';
await rename('old.db', 'new.db', {
  fromPathBaseDir: BaseDirectory.AppLocalData,
  toPathBaseDir: BaseDirectory.Temp,
});
```

### Remove
```typescript
import { remove, BaseDirectory } from '@tauri-apps/plugin-fs';
await remove('user.db', { baseDir: BaseDirectory.AppLocalData });
```

## Directory Operations

### Create
```typescript
import { mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
await mkdir('images', { baseDir: BaseDirectory.AppLocalData });
```

### Read
```typescript
import { readDir, BaseDirectory } from '@tauri-apps/plugin-fs';
const entries = await readDir('users', { baseDir: BaseDirectory.AppLocalData });
```

### Exists
```typescript
import { exists, BaseDirectory } from '@tauri-apps/plugin-fs';
const isExists = await exists('images', { baseDir: BaseDirectory.AppLocalData });
```

## Permissions
Configure in `src-tauri/capabilities/default.json`.

```json
{
  "permissions": [
    "fs:default",
    {
      "identifier": "fs:allow-exists",
      "allow": [{ "path": "$APPDATA/*" }]
    }
  ]
}
```

### Common Base Directory Variables
| Variable | Path Function |
| :--- | :--- |
| `$DOCUMENT` | `documentDir()` |
| `$HOME` | `homeDir()` |
| `$APPDATA` | `appDataDir()` |
| `$TEMP` | `tempDir()` |
| `$DESKTOP` | `desktopDir()` |
