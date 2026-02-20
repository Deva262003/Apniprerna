# Extension Files

Place your built CRX file here:

```
sss-backend/extensions/sss-extension.crx
```

## Building the CRX

1. Navigate to the chrome extension directory:
   ```bash
   cd ../../../sss-chrome-extension
   ```

2. First build (creates key):
   ```bash
   # Windows (Chrome)
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --pack-extension=.

   # Linux
   google-chrome --pack-extension=.
   ```

3. This creates:
   - `sss-chrome-extension.crx` - The packaged extension
   - `sss-chrome-extension.pem` - The private key (KEEP THIS SAFE!)

4. Subsequent builds (use same key):
   ```bash
   google-chrome --pack-extension=. --pack-extension-key=sss-chrome-extension.pem
   ```

5. Copy the CRX here:
   ```bash
   cp sss-chrome-extension.crx ../sss-backend/extensions/sss-extension.crx
   ```

Quick path (Windows PowerShell):
```powershell
.\sss-chrome-extension\scripts\build-crx.ps1
```

## Updating the Extension

1. Update version in `manifest.json`
2. Rebuild CRX with same key
3. Replace `sss-extension.crx` here
4. The backend reads the version from the CRX manifest. No env update needed.
5. Chrome clients auto-update within a few hours

## Environment Variables

Set these in your `.env` (optional fallback if CRX is missing):

```
EXTENSION_ID=your-extension-id-from-crx
EXTENSION_VERSION=1.0.0
```
