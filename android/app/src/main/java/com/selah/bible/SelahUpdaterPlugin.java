package com.selah.bible;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "SelahUpdater")
public class SelahUpdaterPlugin extends Plugin {

    private static final String UPDATES_SUBDIR = "updates";
    private static final int MAX_REDIRECTS = 6;
    private static final int CONNECT_TIMEOUT_MS = 15000;
    private static final int READ_TIMEOUT_MS = 30000;
    private static final int APK_READ_TIMEOUT_MS = 60000;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile String pendingInstallPath;

    private static final class VerifiedApk {
        final long versionCode;
        final String versionName;
        final String sha256;

        VerifiedApk(long versionCode, String versionName, String sha256) {
            this.versionCode = versionCode;
            this.versionName = versionName;
            this.sha256 = sha256;
        }
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void fetchReleaseManifest(PluginCall call) {
        JSArray urlsArray = call.getArray("urls");
        if (urlsArray == null || urlsArray.length() == 0) {
            call.reject("No release manifest URLs provided.");
            return;
        }

        final List<Object> rawUrls;
        try {
            rawUrls = urlsArray.toList();
        } catch (Exception ex) {
            call.reject("Invalid release manifest URL list.", ex);
            return;
        }

        executor.execute(() -> {
            Exception lastError = null;
            for (Object item : rawUrls) {
                if (!(item instanceof String)) continue;
                String candidateUrl = ((String) item).trim();
                if (candidateUrl.isEmpty()) continue;

                HttpURLConnection conn = null;
                try {
                    conn = openTrustedConnection(candidateUrl, true, READ_TIMEOUT_MS);
                    int status = conn.getResponseCode();
                    if (status != HttpURLConnection.HTTP_OK) {
                        lastError = new IOException("Release endpoint returned HTTP " + status);
                        continue;
                    }

                    String body = readUtf8Stream(conn.getInputStream());
                    JSObject result = new JSObject();
                    result.put("status", status);
                    result.put("url", conn.getURL().toString());
                    result.put("body", body);
                    call.resolve(result);
                    return;
                } catch (Exception ex) {
                    lastError = ex;
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }

            call.reject(
                lastError != null && lastError.getMessage() != null
                    ? lastError.getMessage()
                    : "Unable to reach release metadata.",
                lastError
            );
        });
    }

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", canRequestPackageInstallsInternal());
        call.resolve(result);
    }

    @PluginMethod
    public void downloadAndVerifyApk(PluginCall call) {
        String downloadUrl = call.getString("url");
        if (!isTrustedGitHubUrl(downloadUrl)) {
            call.reject("Untrusted update download URL.");
            return;
        }

        String expectedSha256 = call.getString("expectedSha256");
        Integer rawMinCode = call.getInt("minVersionCode", 0);
        long minVersionCode = rawMinCode != null ? rawMinCode.longValue() : 0L;
        String fileName = sanitizeApkFileName(call.getString("fileName", "selah-update.apk"));

        executor.execute(() -> {
            File updatesDir = getUpdatesDir();
            if (!updatesDir.exists() && !updatesDir.mkdirs()) {
                call.reject("Unable to prepare update cache directory.");
                return;
            }

            File destFile = new File(updatesDir, fileName);
            if (destFile.exists()) {
                try {
                    VerifiedApk cached = verifyApk(destFile, minVersionCode, expectedSha256);
                    deleteOtherUpdateFiles(updatesDir, destFile);
                    emitProgress(100, destFile.length(), destFile.length());

                    JSObject result = new JSObject();
                    result.put("path", destFile.getCanonicalPath());
                    result.put("cached", true);
                    result.put("versionCode", cached.versionCode);
                    result.put("versionName", cached.versionName);
                    result.put("sha256", cached.sha256);
                    call.resolve(result);
                    return;
                } catch (Exception ignored) {
                    // Replace stale or mismatched cached file with a fresh download.
                    //noinspection ResultOfMethodCallIgnored
                    destFile.delete();
                }
            }

            File tempApk = new File(updatesDir, "download-" + System.currentTimeMillis() + ".apk");
            HttpURLConnection conn = null;
            try {
                conn = openTrustedConnection(downloadUrl, false, APK_READ_TIMEOUT_MS);
                int status = conn.getResponseCode();
                if (status != HttpURLConnection.HTTP_OK) {
                    throw new IOException("APK download failed with HTTP " + status);
                }

                long totalBytes = conn.getContentLengthLong();
                long downloaded = 0L;
                int lastReportedPct = -1;
                long lastReportTime = 0L;

                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] buffer = new byte[16384];

                try (
                    InputStream in = conn.getInputStream();
                    FileOutputStream out = new FileOutputStream(tempApk)
                ) {
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        digest.update(buffer, 0, read);
                        downloaded += read;

                        long now = System.currentTimeMillis();
                        int pct = totalBytes > 0
                            ? (int) Math.min(99L, (downloaded * 100L) / totalBytes)
                            : -1;
                        if (
                            (pct >= 0 && pct - lastReportedPct >= 2) ||
                            (now - lastReportTime >= 200L)
                        ) {
                            lastReportedPct = pct;
                            lastReportTime = now;
                            emitProgress(pct, downloaded, totalBytes);
                        }
                    }
                    out.flush();
                }

                if (downloaded <= 0L || (totalBytes > 0L && downloaded != totalBytes)) {
                    throw new IOException("Downloaded APK file is incomplete.");
                }

                VerifiedApk verified = verifyApkWithDigest(
                    tempApk,
                    minVersionCode,
                    expectedSha256,
                    toHex(digest.digest())
                );

                if (destFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    destFile.delete();
                }
                if (!tempApk.renameTo(destFile)) {
                    throw new IOException("Could not finalize downloaded update file.");
                }

                deleteOtherUpdateFiles(updatesDir, destFile);
                emitProgress(100, downloaded, downloaded);

                JSObject result = new JSObject();
                result.put("path", destFile.getCanonicalPath());
                result.put("cached", false);
                result.put("versionCode", verified.versionCode);
                result.put("versionName", verified.versionName);
                result.put("sha256", verified.sha256);
                call.resolve(result);
            } catch (Exception ex) {
                if (tempApk.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    tempApk.delete();
                }
                call.reject(
                    ex.getMessage() != null ? ex.getMessage() : "APK download failed.",
                    ex
                );
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    @PluginMethod
    public void installDownloadedApk(PluginCall call) {
        String rawPath = call.getString("path");
        if (rawPath == null || rawPath.trim().isEmpty()) {
            call.reject("Missing downloaded APK path.");
            return;
        }

        try {
            File apkFile = resolveSafeUpdateFile(rawPath);
            verifyApk(apkFile, 0L, null);

            if (!canRequestPackageInstallsInternal() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                pendingInstallPath = apkFile.getCanonicalPath();
                Intent permissionIntent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                startActivityForResult(call, permissionIntent, "handleInstallPermissionResult");
                return;
            }

            launchPackageInstaller(apkFile);
            JSObject result = new JSObject();
            result.put("started", true);
            result.put("needsPermission", false);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject(
                ex.getMessage() != null ? ex.getMessage() : "Could not launch update installer.",
                ex
            );
        }
    }

    @ActivityCallback
    private void handleInstallPermissionResult(PluginCall call, ActivityResult ignoredResult) {
        String path = pendingInstallPath;
        pendingInstallPath = null;
        if (call == null) {
            return;
        }
        if (path == null) {
            path = call.getString("path");
        }

        try {
            if (!canRequestPackageInstallsInternal() || path == null) {
                JSObject result = new JSObject();
                result.put("started", false);
                result.put("needsPermission", true);
                call.resolve(result);
                return;
            }

            File apkFile = resolveSafeUpdateFile(path);
            verifyApk(apkFile, 0L, null);
            launchPackageInstaller(apkFile);

            JSObject result = new JSObject();
            result.put("started", true);
            result.put("needsPermission", false);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject(
                ex.getMessage() != null ? ex.getMessage() : "Could not install downloaded update.",
                ex
            );
        }
    }

    @PluginMethod
    public void clearObsoleteUpdates(PluginCall call) {
        executor.execute(() -> {
            int deletedCount = 0;
            File updatesDir = getUpdatesDir();
            if (updatesDir.isDirectory()) {
                File[] files = updatesDir.listFiles();
                if (files != null) {
                    long installedCode = getInstalledVersionCode();
                    String packageName = getContext().getPackageName();
                    PackageManager pm = getContext().getPackageManager();

                    for (File file : files) {
                        if (!file.isFile()) continue;
                        if (!file.getName().endsWith(".apk")) {
                            if (file.delete()) deletedCount++;
                            continue;
                        }
                        try {
                            PackageInfo info = pm.getPackageArchiveInfo(file.getAbsolutePath(), 0);
                            if (
                                info == null ||
                                !packageName.equals(info.packageName) ||
                                PackageInfoCompat.getLongVersionCode(info) <= installedCode
                            ) {
                                if (file.delete()) deletedCount++;
                            }
                        } catch (Exception ex) {
                            if (file.delete()) deletedCount++;
                        }
                    }
                }
            }
            JSObject result = new JSObject();
            result.put("deletedCount", deletedCount);
            call.resolve(result);
        });
    }

    private boolean canRequestPackageInstallsInternal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return true;
        }
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void launchPackageInstaller(File apkFile) {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (getActivity() != null) {
            getActivity().startActivity(intent);
        } else {
            context.startActivity(intent);
        }
    }

    private File getUpdatesDir() {
        return new File(getContext().getCacheDir(), UPDATES_SUBDIR);
    }

    private File resolveSafeUpdateFile(String rawPath) throws IOException {
        File updatesDir = getUpdatesDir().getCanonicalFile();
        File candidate = new File(rawPath).getCanonicalFile();
        String dirPrefix = updatesDir.getPath() + File.separator;
        if (!candidate.getPath().startsWith(dirPrefix) || !candidate.isFile()) {
            throw new SecurityException("Update package path is invalid or missing.");
        }
        return candidate;
    }

    private long getInstalledVersionCode() {
        try {
            PackageInfo installed = getContext()
                .getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);
            return PackageInfoCompat.getLongVersionCode(installed);
        } catch (Exception ex) {
            return 0L;
        }
    }

    private VerifiedApk verifyApk(File apkFile, long minVersionCode, String expectedSha256)
        throws Exception {
        String actualSha256 = computeFileSha256(apkFile);
        return verifyApkWithDigest(apkFile, minVersionCode, expectedSha256, actualSha256);
    }

    private VerifiedApk verifyApkWithDigest(
        File apkFile,
        long minVersionCode,
        String expectedSha256,
        String actualSha256
    ) throws Exception {
        if (
            expectedSha256 != null &&
            !expectedSha256.trim().isEmpty() &&
            !actualSha256.equalsIgnoreCase(expectedSha256.trim())
        ) {
            throw new SecurityException("Downloaded APK checksum mismatch.");
        }

        PackageManager pm = getContext().getPackageManager();
        String pkgName = getContext().getPackageName();
        PackageInfo archiveInfo = pm.getPackageArchiveInfo(apkFile.getAbsolutePath(), 0);
        if (archiveInfo == null || !pkgName.equals(archiveInfo.packageName)) {
            throw new SecurityException("Downloaded APK is not signed for Selah.");
        }

        long installedCode = getInstalledVersionCode();
        long archiveCode = PackageInfoCompat.getLongVersionCode(archiveInfo);
        if (archiveCode <= installedCode) {
            throw new IllegalStateException("Downloaded APK build is not newer than the installed app.");
        }
        if (minVersionCode > 0L && archiveCode < minVersionCode) {
            throw new SecurityException("Downloaded APK versionCode is lower than advertised.");
        }

        Set<String> installedSigs = getInstalledSignatures(pm, pkgName);
        Set<String> archiveSigs = getArchiveSignatures(pm, apkFile.getAbsolutePath());
        if (
            installedSigs.isEmpty() ||
            archiveSigs.isEmpty() ||
            Collections.disjoint(installedSigs, archiveSigs)
        ) {
            throw new SecurityException("Downloaded APK signing certificate does not match the installed app.");
        }

        String versionName = archiveInfo.versionName != null ? archiveInfo.versionName : "";
        return new VerifiedApk(archiveCode, versionName, actualSha256);
    }

    @SuppressWarnings("deprecation")
    private Set<String> getInstalledSignatures(PackageManager pm, String pkgName) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageInfo info = pm.getPackageInfo(pkgName, PackageManager.GET_SIGNING_CERTIFICATES);
            Set<String> digests = extractCertificateDigests(info);
            if (!digests.isEmpty()) {
                return digests;
            }
        }
        PackageInfo legacy = pm.getPackageInfo(pkgName, PackageManager.GET_SIGNATURES);
        return extractCertificateDigests(legacy);
    }

    @SuppressWarnings("deprecation")
    private Set<String> getArchiveSignatures(PackageManager pm, String archivePath) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageInfo info = pm.getPackageArchiveInfo(
                archivePath,
                PackageManager.GET_SIGNING_CERTIFICATES
            );
            if (info != null) {
                Set<String> digests = extractCertificateDigests(info);
                if (!digests.isEmpty()) {
                    return digests;
                }
            }
        }
        PackageInfo legacy = pm.getPackageArchiveInfo(archivePath, PackageManager.GET_SIGNATURES);
        return legacy != null ? extractCertificateDigests(legacy) : Collections.emptySet();
    }

    @SuppressWarnings("deprecation")
    private Set<String> extractCertificateDigests(PackageInfo info) throws Exception {
        if (info == null) {
            return Collections.emptySet();
        }
        Signature[] sigs = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && info.signingInfo != null) {
            sigs = info.signingInfo.hasMultipleSigners()
                ? info.signingInfo.getApkContentsSigners()
                : info.signingInfo.getSigningCertificateHistory();
        }
        if ((sigs == null || sigs.length == 0) && info.signatures != null) {
            sigs = info.signatures;
        }
        if (sigs == null || sigs.length == 0) {
            return Collections.emptySet();
        }

        MessageDigest md = MessageDigest.getInstance("SHA-256");
        Set<String> digests = new HashSet<>();
        for (Signature sig : sigs) {
            if (sig != null) {
                digests.add(toHex(md.digest(sig.toByteArray())));
                md.reset();
            }
        }
        return digests;
    }

    private void emitProgress(int progress, long bytesDownloaded, long totalBytes) {
        JSObject data = new JSObject();
        data.put("progress", progress);
        data.put("bytesDownloaded", bytesDownloaded);
        data.put("totalBytes", totalBytes);
        notifyListeners("downloadProgress", data);
    }

    private void deleteOtherUpdateFiles(File updatesDir, File keepFile) {
        File[] files = updatesDir.listFiles();
        if (files == null) return;
        for (File file : files) {
            if (!file.equals(keepFile)) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
        }
    }

    private static HttpURLConnection openTrustedConnection(
        String rawUrl,
        boolean jsonRequest,
        int readTimeoutMs
    ) throws IOException {
        String currentUrl = rawUrl;
        for (int hop = 0; hop < MAX_REDIRECTS; hop++) {
            if (!isTrustedGitHubUrl(currentUrl)) {
                throw new SecurityException("Blocked redirect to untrusted host.");
            }
            URL url = new URL(currentUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(readTimeoutMs);
            conn.setRequestProperty("User-Agent", "Selah-Android-Updater");
            if (jsonRequest && "api.github.com".equalsIgnoreCase(url.getHost())) {
                conn.setRequestProperty("Accept", "application/vnd.github+json");
                conn.setRequestProperty("X-GitHub-Api-Version", "2022-11-28");
            }

            int code = conn.getResponseCode();
            if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || location.trim().isEmpty()) {
                    throw new IOException("Redirect response missing Location header.");
                }
                currentUrl = new URL(url, location).toString();
                continue;
            }
            return conn;
        }
        throw new IOException("Too many redirects while fetching update.");
    }

    private static boolean isTrustedGitHubUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return false;
        }
        try {
            URL url = new URL(rawUrl);
            if (!"https".equalsIgnoreCase(url.getProtocol())) {
                return false;
            }
            String host = url.getHost().toLowerCase(Locale.US);
            return (
                "github.com".equals(host) ||
                "api.github.com".equals(host) ||
                host.endsWith(".githubusercontent.com")
            );
        } catch (Exception ex) {
            return false;
        }
    }

    private static String sanitizeApkFileName(String rawName) {
        String cleaned = (rawName == null ? "" : rawName.trim())
            .replaceAll("[^A-Za-z0-9._-]", "_");
        if (cleaned.isEmpty() || ".".equals(cleaned) || "..".equals(cleaned)) {
            cleaned = "selah-update.apk";
        }
        if (!cleaned.toLowerCase(Locale.US).endsWith(".apk")) {
            cleaned = cleaned + ".apk";
        }
        return cleaned;
    }

    private static String readUtf8Stream(InputStream stream) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[4096];
        int read;
        while ((read = stream.read(chunk)) != -1) {
            buffer.write(chunk, 0, read);
        }
        return buffer.toString(StandardCharsets.UTF_8.name());
    }

    private static String computeFileSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] chunk = new byte[16384];
        try (FileInputStream in = new FileInputStream(file)) {
            int read;
            while ((read = in.read(chunk)) != -1) {
                digest.update(chunk, 0, read);
            }
        }
        return toHex(digest.digest());
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.US, "%02x", b));
        }
        return sb.toString();
    }
}
