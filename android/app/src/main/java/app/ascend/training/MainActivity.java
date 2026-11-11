package app.ascend.training;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // De eigen brug naar de widget (src/integrations/widgetBridge.ts); vóór super, zoals Capacitor vraagt.
        registerPlugin(WidgetBridgePlugin.class);
        // Een bestand aanbieden aan een andere app (src/integrations/fileSender.ts).
        registerPlugin(FileOpenPlugin.class);
        // Andere audio even zachter terwijl de rustbel klinkt (src/integrations/deviceShell.ts).
        registerPlugin(AudioFocusPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
