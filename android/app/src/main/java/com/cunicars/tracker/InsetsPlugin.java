package com.cunicars.tracker;

import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Alto real de las barras del sistema.
 *
 * Android 15 en adelante dibuja la app de borde a borde: el WebView queda por
 * debajo de la barra de estado y de la de navegacion. El WebView no expone esas
 * alturas por CSS (env(safe-area-inset-*) llega en cero), asi que el front las
 * pide por aca y las usa como margenes.
 *
 * Devuelve pixeles CSS (dp), que es la unidad en la que piensa el front.
 */
@CapacitorPlugin(name = "Insets")
public class InsetsPlugin extends Plugin {

    @PluginMethod
    public void get(final PluginCall call) {
        getActivity()
            .runOnUiThread(() -> {
                JSObject ret = new JSObject();
                int top = 0;
                int bottom = 0;

                View view = getBridge().getWebView();
                WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(view);
                if (insets != null) {
                    Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                    float density = getContext().getResources().getDisplayMetrics().density;
                    top = Math.round(bars.top / density);
                    bottom = Math.round(bars.bottom / density);
                }

                ret.put("top", top);
                ret.put("bottom", bottom);
                call.resolve(ret);
            });
    }
}
