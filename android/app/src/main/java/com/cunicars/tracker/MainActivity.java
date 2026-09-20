package com.cunicars.tracker;

import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(InsetsPlugin.class);
        super.onCreate(savedInstanceState);

        // Con la barra de navegación de tres botones, Android le dibuja detrás un
        // velo translúcido para que los botones contrasten con el contenido. Sobre
        // el mapa se ve como una franja blanquecina. Lo desactivamos para que la
        // barra quede realmente transparente.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
            getWindow().setStatusBarContrastEnforced(false);
        }
    }
}
