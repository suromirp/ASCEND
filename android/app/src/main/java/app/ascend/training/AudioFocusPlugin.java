package app.ascend.training;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// De rustbel van Forge (src/utils/restBell.ts via src/integrations/deviceShell.ts): andere audio, zoals
// je muziek, gaat even zachter terwijl de bel klinkt. Vraagt audio focus met ducking
// (AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK) en geeft hem na de gevraagde tijd terug; Android zet de andere
// audio dan zelf terug. Geen recht nodig, geen netwerk. minSdk is 26, dus AudioFocusRequest bestaat.
@CapacitorPlugin(name = "AudioFocus")
public class AudioFocusPlugin extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private AudioFocusRequest current;
    private final Runnable release = this::abandon;

    // Alles op de mainthread, net als het loslaten: zo kunnen een nieuwe vraag en het loslaten elkaar
    // niet kruisen.
    @PluginMethod
    public void duck(PluginCall call) {
        // De grens is DUCK_MAX_MS in src/engine/restSounds.ts.
        int ms = Math.max(200, Math.min(8000, call.getInt("ms", 2000)));
        handler.post(() -> request(ms));
        call.resolve();
    }

    private void request(int ms) {
        AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audio == null) return;
        handler.removeCallbacks(release);
        if (current == null) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            current = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs)
                .setOnAudioFocusChangeListener(change -> { })
                .build();
            audio.requestAudioFocus(current);
        }
        handler.postDelayed(release, ms);
    }

    private void abandon() {
        AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audio != null && current != null) audio.abandonAudioFocusRequest(current);
        current = null;
    }

    @Override
    protected void handleOnDestroy() {
        handler.removeCallbacks(release);
        abandon();
    }
}
