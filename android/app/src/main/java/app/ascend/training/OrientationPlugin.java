package app.ascend.training;

import android.app.Activity;
import android.content.pm.ActivityInfo;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// De vergrote kaart van Route mag liggend; de rest van de app staat rechtop
// (android:screenOrientation="portrait" in het manifest, besluit 2026-11-11-alleen-staand.md).
// `free` laat de app met de telefoon meedraaien (en volgt het slot op draaien van de gebruiker),
// `portrait` zet hem terug. Aangeroepen via src/integrations/deviceShell.ts#freeRotation.
// Geen recht nodig, geen netwerk.
@CapacitorPlugin(name = "Orientation")
public class OrientationPlugin extends Plugin {
    @PluginMethod
    public void free(PluginCall call) {
        set(ActivityInfo.SCREEN_ORIENTATION_FULL_USER);
        call.resolve();
    }

    @PluginMethod
    public void portrait(PluginCall call) {
        set(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        call.resolve();
    }

    private void set(int value) {
        Activity activity = getActivity();
        if (activity == null) return;
        activity.runOnUiThread(() -> activity.setRequestedOrientation(value));
    }
}
