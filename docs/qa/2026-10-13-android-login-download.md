# Android login and lost installer download

The user reported the generic German login error on Android and could not
confirm whether the Hostinger migration update was installed. The phone itself
was unavailable for inspection, so its login failure remains unconfirmed.

On 13 October 2026, two password logins with the existing ordinary synthetic
review account succeeded against the public production Auth endpoint: once with
the server anon key and once with the exact key extracted from the signed
Android 1.0.53 artifact. The keys match and both responses allow the Android
origin `https://localhost`. No user password was requested or changed.

The APK download URL returned HTTP 200 **with HTML**, because the web release
had removed `dist/downloads` and Caddy fell back to `index.html`. HTTP status
alone was therefore an insufficient download check. The previous release still
contained the original installer. Its SHA256 was verified before restoring only
that file into the current release, without restarting services:

- URL: https://beta.kletterwelt-sauerland.de/downloads/KWS-Beta-Hostinger-1.0.53.apk
- Size: 12,230,063 bytes
- SHA256: `b63cee6f5852cd570a5efd99e2fc092a4e0708e843bc4110088a7890391e1f48`
- After repair: HTTP 200, `application/vnd.android.package-archive`, downloaded
  bytes match the original artifact exactly.

`update-production-web.py` now carries existing downloads into the next build,
verifies their bytes, refuses conflicting replacements, and tests the actual
installer HTTP response inside the release rollback boundary. Four regression
tests cover a lost directory, identical existing file, conflicting installer,
and releases without downloads. Run:

```text
python ops/hostinger/test-update-production-web.py
```

The download restoration is live. The deployment-script change needs to be
included in the operator used for the next web deployment. No full web release,
account reset, source-cloud unfreeze, or physical Android login was performed.
The next user step is to install the restored update over the existing app and
retry login. If it still fails, inspect the installed version and actual client
Auth response; the generic message alone cannot identify the cause.
