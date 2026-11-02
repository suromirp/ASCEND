package app.ascend.training;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

// De widget "Vandaag" op het startscherm. Hij leest de samenvatting die de web-app zelf op het
// toestel bewaart (WidgetBridgePlugin) en toont "Open ASCEND" als de datum niet van vandaag is.
// Een tik opent de app op Vandaag. Er gaat niets het toestel uit.
public class TodayWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "ascend_widget";

    // Vanaf deze hoogte (dp, de minimale hoogte die de launcher meldt) is er ruimte voor de kopregel
    // en een eigen regel voor morgen; lager staat alles compact. Vanaf deze breedte passen de duur en
    // morgen op één regel.
    static final int TALL_DP = 100;
    static final int WIDE_DP = 220;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) update(context, manager, id);
    }

    // De gebruiker maakt de widget groter of kleiner: opnieuw indelen.
    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        update(context, manager, id);
    }

    static void update(Context context, AppWidgetManager manager, int id) {
        Bundle options = manager.getAppWidgetOptions(id);
        int width = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int height = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        manager.updateAppWidget(id, build(context, width, height));
    }

    // Om middernacht en bij een andere tijd of tijdzone: opnieuw tekenen, de datum klopt dan niet meer.
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)) {
            refresh(context);
        }
    }

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TodayWidgetProvider.class));
        for (int id : ids) update(context, manager, id);
    }

    static int iconFor(String kind) {
        switch (kind == null ? "" : kind) {
            case "run": return R.drawable.ic_widget_run;
            case "strength": return R.drawable.ic_widget_strength;
            case "walk": return R.drawable.ic_widget_walk;
            case "mountain": return R.drawable.ic_widget_mountain;
            case "bike": return R.drawable.ic_widget_bike;
            default: return R.drawable.ic_widget_rest;
        }
    }

    // widthDp en heightDp zijn de minimale maten die de launcher meldt; 0 als ze onbekend zijn (dan compact).
    static RemoteViews build(Context context, int widthDp, int heightDp) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today);
        boolean tall = heightDp >= TALL_DP;
        boolean wide = widthDp >= WIDE_DP;
        String title = prefs.getString("title", null);
        String detail = null;
        String tomorrowLong = null;
        String tomorrowShort = null;
        boolean done = false;
        int icon = R.drawable.ic_widget_rest;
        if (title != null && today.equals(prefs.getString("date", ""))) {
            done = prefs.getBoolean("done", false);
            icon = done ? R.drawable.ic_widget_done : iconFor(prefs.getString("kind", "rest"));
            int minutes = prefs.getInt("minutes", 0);
            if (done) {
                detail = context.getString(R.string.widget_done);
            } else if (minutes > 0) {
                detail = context.getString(R.string.widget_minutes, minutes);
            }
            String tomorrow = prefs.getString("tomorrow", "");
            if (tomorrow != null && !tomorrow.isEmpty()) {
                tomorrowLong = context.getString(R.string.widget_tomorrow, tomorrow);
                tomorrowShort = context.getString(R.string.widget_tomorrow_short, tomorrow);
            } else if (prefs.getBoolean("tomorrowRest", false)) {
                tomorrowLong = context.getString(R.string.widget_tomorrow_rest);
                tomorrowShort = context.getString(R.string.widget_tomorrow_rest_short);
            }
        } else {
            title = context.getString(R.string.widget_open);
        }
        views.setImageViewResource(R.id.widget_icon, icon);
        views.setTextViewText(R.id.widget_title, title);
        views.setInt(R.id.widget_title, "setMaxLines", tall ? 2 : 1);
        views.setViewVisibility(R.id.widget_eyebrow, tall ? View.VISIBLE : View.GONE);
        views.setTextColor(R.id.widget_minutes, context.getColor(done ? R.color.ascend_action : R.color.ascend_ink_dim));

        String line = detail;
        String extra = null;
        if (tomorrowLong != null) {
            if (tall) {
                extra = tomorrowLong;
            } else if (wide) {
                line = detail == null ? tomorrowLong : context.getString(R.string.widget_join, detail, tomorrowShort);
            }
        }
        if (line != null) {
            views.setTextViewText(R.id.widget_minutes, line);
            views.setViewVisibility(R.id.widget_minutes, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_minutes, View.GONE);
        }
        if (extra != null) {
            views.setTextViewText(R.id.widget_tomorrow, extra);
            views.setViewVisibility(R.id.widget_tomorrow, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_tomorrow, View.GONE);
        }
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("app.ascend.training://open/vandaag"));
        open.setClass(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return views;
    }
}
