package app.ascend.training;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
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

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(context));
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
        for (int id : ids) manager.updateAppWidget(id, build(context));
    }

    static RemoteViews build(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today);
        String title = prefs.getString("title", null);
        if (title != null && today.equals(prefs.getString("date", ""))) {
            views.setTextViewText(R.id.widget_title, title);
            int minutes = prefs.getInt("minutes", 0);
            if (minutes > 0) {
                views.setTextViewText(R.id.widget_minutes, context.getString(R.string.widget_minutes, minutes));
                views.setViewVisibility(R.id.widget_minutes, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_minutes, View.GONE);
            }
        } else {
            views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_open));
            views.setViewVisibility(R.id.widget_minutes, View.GONE);
        }
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("app.ascend.training://open/vandaag"));
        open.setClass(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return views;
    }
}
