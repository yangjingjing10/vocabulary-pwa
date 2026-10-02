package com.vocabulary.app;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Capacitor 8：启用 edge-to-edge，配合 SystemBars 注入安全区 CSS 变量
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
