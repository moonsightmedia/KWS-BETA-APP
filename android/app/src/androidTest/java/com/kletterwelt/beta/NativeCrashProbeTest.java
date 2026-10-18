package com.kletterwelt.beta;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Method;
import org.junit.Assert;
import org.junit.Assume;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NativeCrashProbeTest {
    @Test
    public void explicitNativeCrashProbe() throws Exception {
        Bundle arguments = InstrumentationRegistry.getArguments();
        Assume.assumeTrue("true".equals(arguments.getString("run_native_crash_probe")));
        String reportId = arguments.getString("probe_report_id", "");
        Assert.assertTrue(reportId.matches("[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}"));
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        Assert.assertNotNull(launch);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(launch);
        Class<?> sentryClass = Class.forName("io.sentry.Sentry");
        Method enabled = sentryClass.getMethod("isEnabled");
        long deadline = SystemClock.elapsedRealtime() + 45_000;
        while (!Boolean.TRUE.equals(enabled.invoke(null)) && SystemClock.elapsedRealtime() < deadline) {
            SystemClock.sleep(250);
        }
        Assert.assertEquals(Boolean.TRUE, enabled.invoke(null));
        Method setTag = sentryClass.getMethod("setTag", String.class, String.class);
        setTag.invoke(null, "report_id", reportId);
        setTag.invoke(null, "monitoring_probe", "native_android");
        SystemClock.sleep(2_000);
        Thread crashThread = new Thread(() -> {
            throw new RuntimeException("Controlled KWS native crash verification");
        }, "KwsNativeCrashProbe");
        crashThread.start();
        crashThread.join(30_000);
        Assert.fail("Expected the native process to terminate; verify provider receipt after relaunch");
    }
}
