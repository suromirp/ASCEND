package app.ascend.training;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // De eigen brug naar de widget (src/integrations/widgetBridge.ts); vóór super, zoals Capacitor vraagt.
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
