package app.ascend.training;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

// Een bestand uit de cachemap van de app aanbieden aan een andere app (src/integrations/fileSender.ts),
// bijvoorbeeld een GPX-bestand van een voorgestelde lus aan de app van je horloge. Altijd met de
// keuzelijst van Android, zodat de gebruiker zelf kiest; een standaardapp slaat de lijst niet over.
// De lijst bevat apps die het bestand kunnen openen (ACTION_VIEW, met het opgegeven type en met de
// algemene typen) en apps die het aannemen via delen (ACTION_SEND). Alleen leesrecht op dit ene
// bestand, via de FileProvider die al in het manifest staat (res/xml/file_paths.xml: de cachemap).
// Geen netwerk, geen nieuw recht.
@CapacitorPlugin(name = "FileOpen")
public class FileOpenPlugin extends Plugin {
    private static final String[] GENERIC_TYPES = { "application/octet-stream", "application/xml", "text/xml" };

    @PluginMethod
    public void open(PluginCall call) {
        String path = call.getString("path");
        String mimeType = call.getString("mimeType");
        String title = call.getString("title", "");
        if (path == null || mimeType == null || path.contains("..")) {
            call.reject("path en mimeType zijn nodig");
            return;
        }
        try {
            File cache = getContext().getCacheDir();
            File file = new File(cache, path);
            if (!file.getCanonicalPath().startsWith(cache.getCanonicalPath() + File.separator) || !file.isFile()) {
                call.reject("bestand niet gevonden");
                return;
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            ClipData clip = ClipData.newRawUri(file.getName(), uri);

            Intent view = viewIntent(uri, mimeType, clip);
            Intent[] alternates = new Intent[GENERIC_TYPES.length + 1];
            for (int i = 0; i < GENERIC_TYPES.length; i++) alternates[i] = viewIntent(uri, GENERIC_TYPES[i], clip);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mimeType);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.setClipData(clip);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            alternates[GENERIC_TYPES.length] = send;

            Intent chooser = Intent.createChooser(view, title);
            chooser.putExtra(Intent.EXTRA_ALTERNATE_INTENTS, alternates);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve(new JSObject());
        } catch (Exception e) {
            call.reject("openen lukte niet", e);
        }
    }

    private static Intent viewIntent(Uri uri, String type, ClipData clip) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, type);
        intent.setClipData(clip);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }
}
