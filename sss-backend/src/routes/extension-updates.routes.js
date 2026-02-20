const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

// Configuration - update these values
const EXTENSION_ID = process.env.EXTENSION_ID || 'gpnelbkbfdfffignkgengnhdlkfmnlpe';

const EXTENSION_DIR = path.join(__dirname, '../../extensions');

function getExtensionVersion() {
  try {
    const crxPath = path.join(EXTENSION_DIR, 'sss-extension.crx');
    
    if (!fs.existsSync(crxPath)) {
      return null;
    }

    const crxData = fs.readFileSync(crxPath);

    // Find the ZIP signature to handle both CRX2 and CRX3.
    const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const zipStart = crxData.indexOf(zipSignature);
    if (zipStart === -1) {
      return null;
    }

    const zipData = crxData.slice(zipStart);
    const zip = new AdmZip(zipData);
    const manifestEntry = zip.getEntry('manifest.json');
    
    if (!manifestEntry) {
      return null;
    }
    
    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    return manifest.version || null;
  } catch (error) {
    console.error('Error reading extension version:', error);
    return null;
  }
}

function getCrxPath(version) {
  if (!version || version === 'latest') {
    return path.join(EXTENSION_DIR, 'sss-extension.crx');
  }

  const versionedPath = path.join(EXTENSION_DIR, `sss-extension-${version}.crx`);
  if (fs.existsSync(versionedPath)) {
    return versionedPath;
  }

  return path.join(EXTENSION_DIR, 'sss-extension.crx');
}

// @route   GET /api/v1/extension/updates.xml
// @desc    Chrome extension update manifest
// @access  Public
router.get('/updates.xml', (req, res) => {
  const version = getExtensionVersion() || '1.0.0';
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const serverUrl = `${protocol}://${req.get('host')}`;
  const downloadUrl = `${serverUrl}/api/v1/extension/crx/${version}`;

  const xml = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${EXTENSION_ID}'>
    <updatecheck codebase='${downloadUrl}' version='${version}' />
  </app>
</gupdate>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// @route   GET /api/v1/extension/download
// @desc    Download the extension CRX file
// @access  Public
router.get('/crx/:version', (req, res) => {
  const version = req.params.version || getExtensionVersion();
  const crxPath = getCrxPath(version);

  // Check if CRX file exists
  if (!fs.existsSync(crxPath)) {
    return res.status(404).json({
      success: false,
      message: 'Extension file not found. Please build and upload the CRX file.'
    });
  }

  res.set({
    'Content-Type': 'application/x-chrome-extension',
    'Content-Disposition': `attachment; filename="sss-extension-${version}.crx"`
  });

  res.sendFile(crxPath);
});

// Backward compatibility
router.get('/download', (req, res) => {
  const version = getExtensionVersion();
  req.params.version = version;
  return res.redirect(`/api/v1/extension/crx/${version}`);
});

// @route   GET /api/v1/extension/version
// @desc    Get current extension version
// @access  Public
router.get('/version', (req, res) => {
  const version = getExtensionVersion();
  res.json({
    success: true,
    data: {
      version: version,
      extensionId: EXTENSION_ID
    }
  });
});

module.exports = router;
