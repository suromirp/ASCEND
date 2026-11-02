package app.ascend.training;

import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// De brug van de web-app naar de widget (src/integrations/widgetBridge.ts): bewaart de kleine
// samenvatting van vandaag (datum, titel, minuten, soort, gedaan, morgen) in de voorkeuren van de app zelf en ververst
// de widget. Geen netwerk, niets verlaat het toestel.
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void set(PluginCall call) {
        String date = call.getString("date");
        String title = call.getString("title");
        if (date == null || title == null) {
            call.reject("date en title zijn nodig");
            return;
        }
        SharedPreferences.Editor edit = getContext().getSharedPreferences(TodayWidgetProvider.PREFS, android.content.Context.MODE_PRIVATE).edit();
        edit.putString("date", date)
            .putString("title", title)
            .putInt("minutes", call.getInt("minutes", 0))
            .putString("kind", call.getString("kind", "rest"))
            .putBoolean("done", Boolean.TRUE.equals(call.getBoolean("done", false)))
            .putString("tomorrow", call.getString("tomorrow", ""))
            .putBoolean("tomorrowRest", Boolean.TRUE.equals(call.getBoolean("tomorrowRest", false)))
            .apply();
        TodayWidgetProvider.refresh(getContext());
        call.resolve(new JSObject());
    }
}
