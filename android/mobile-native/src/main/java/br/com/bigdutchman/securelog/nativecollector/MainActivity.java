package br.com.bigdutchman.securelog.nativecollector;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Build;
import android.util.Log;
import android.provider.Settings;
import android.text.InputType;
import android.view.MotionEvent;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.ArrayAdapter;
import android.widget.Spinner;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;
import java.util.List;

public class MainActivity extends Activity {
    private static final String PREFS = "securelog_native_collector";
    private static final String LOG_TAG = "SecureLogDataWedge";
    private static final int ORANGE = Color.rgb(235, 118, 0);
    private static final int BG = Color.rgb(247, 248, 250);
    private static final int INK = Color.rgb(31, 38, 46);
    private static final int MUTED = Color.rgb(68, 68, 68);
    private static final int SUCCESS = Color.rgb(35, 130, 75);
    private static final int WARNING = Color.rgb(180, 100, 20);
    private static final int ERROR = Color.rgb(180, 50, 50);
    private static final int WHITE = Color.WHITE;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private EditText serverInput;
    private EditText portInput;
    private EditText userInput;
    private EditText passwordInput;
    private EditText configServerInput;
    private EditText configPortInput;
    private EditText configDeviceInput;
    private EditText configTokenInput;
    private TextView configStatus;
    private TextView operatorConnection;
    private boolean sessionActive;
    private boolean qrLoginInProgress;
    private boolean receiverRegistered;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable inactivityLogout = () -> { if (sessionActive) showLogin(); };
    private final Runnable syncLoop = new Runnable() {
        @Override public void run() { if (sessionActive) { executor.execute(MainActivity.this::syncPendingReadings); handler.postDelayed(this, 15000); } }
    };
    private final BroadcastReceiver zebraReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            String code = intent.getStringExtra("com.symbol.datawedge.data_string");
            if ("com.symbol.datawedge.scanner_status".equals(action)) {
                String scannerStatus = intent.getStringExtra("com.symbol.datawedge.scanner_status");
                appendDiagnostic("DataWedge status: " + (scannerStatus == null ? "sem status" : scannerStatus));
                return;
            }
            appendDiagnostic("DataWedge evento recebido: " + (action == null ? "sem ação" : action) + ", dados=" + (code == null ? "ausentes" : code.length() + " caracteres"));
            if (code != null && !code.trim().isEmpty()) {
                String scanned = code.trim();
                if (sessionActive && codeInput != null) {
                    codeInput.setText(scanned);
                    if (operatorConnection != null) recordReading(operatorConnection);
                } else if (!sessionActive && userInput != null && passwordInput != null) {
                    loginFromQr(scanned);
                }
            }
        }
    };
    private TextView status;
    private TextView scannerDiagnostic;
    private LinearLayout content;
    private SharedPreferences prefs;
    private Spinner locationSpinner;
    private EditText codeInput;
    private JSONArray operatorLocations;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        showLogin();
        applyKioskMode();
    }

    @Override public boolean dispatchTouchEvent(MotionEvent event) {
        if (sessionActive && event.getAction() == MotionEvent.ACTION_DOWN) resetInactivity();
        return super.dispatchTouchEvent(event);
    }

    @Override protected void onResume() {
        super.onResume();
        applyKioskMode();
        if (!receiverRegistered) {
            IntentFilter filter = new IntentFilter();
            filter.addAction("com.symbol.datawedge.data_string");
            filter.addAction("com.symbol.datawedge.scanner_status");
            filter.addCategory(Intent.CATEGORY_DEFAULT);
            if (Build.VERSION.SDK_INT >= 33) registerReceiver(zebraReceiver, filter, Context.RECEIVER_EXPORTED);
            else registerReceiver(zebraReceiver, filter);
            receiverRegistered = true;
        }
        configureDataWedge();
    }

    @Override protected void onPause() {
        if (receiverRegistered) { unregisterReceiver(zebraReceiver); receiverRegistered = false; }
        super.onPause();
    }

    private void showLogin() {
        sessionActive = false;
        handler.removeCallbacks(inactivityLogout);
        handler.removeCallbacks(syncLoop);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(20), dp(20), dp(20), dp(20));
        content.setBackgroundColor(BG);
        content.addView(header(), params(WRAP, dp(62)));
        TextView title = text("Acesso do coletor", 24, INK);
        title.setTypeface(null, 1);
        content.addView(title, params(WRAP, dp(42)));
        TextView subtitle = text("Entre com sua conta para iniciar as leituras.", 15, MUTED);
        content.addView(subtitle, params(WRAP, dp(36)));

        userInput = field("Usuário", prefs.getString("last_user", ""), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        passwordInput = field("Senha", "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);

        content.addView(userInput, params(WRAP, dp(58)));
        content.addView(passwordInput, params(WRAP, dp(58)));

        Button login = button("Entrar");
        login.setOnClickListener(v -> login());
        content.addView(login, params(WRAP, dp(56)));

        Button settings = secondaryButton("Configurações");
        settings.setOnClickListener(v -> requestConfigAccess());
        content.addView(settings, params(WRAP, dp(56)));

        status = text("", 14, Color.DKGRAY);
        status.setPadding(0, dp(14), 0, 0);
        String provisioningStatus = prefs.getString("provision_status", "");
        if (!provisioningStatus.isEmpty()) status.setText(provisioningStatus);
        content.addView(status, params(WRAP, dp(70)));
        scannerDiagnostic = text("Scanner: " + prefs.getString("last_scan_debug", "aguardando leitura"), 12, MUTED);
        content.addView(scannerDiagnostic, params(WRAP, dp(42)));
        setContentView(scroll(content));
    }

    private void login() {
        String server = prefs.getString("server", "").trim();
        String port = prefs.getString("port", "").trim();
        String username = userInput.getText().toString().trim();
        String password = passwordInput.getText().toString();
        if (server.isEmpty() || port.isEmpty()) {
            qrLoginInProgress = false;
            status.setText("Configure o servidor antes de entrar.");
            status.setTextColor(Color.rgb(180, 100, 20));
            return;
        }
        if (username.isEmpty() || password.isEmpty()) {
            qrLoginInProgress = false;
            status.setText("Preencha usuário e senha.");
            status.setTextColor(Color.rgb(180, 50, 50));
            return;
        }
        prefs.edit().putString("last_user", username).apply();
        status.setText("Conectando ao servidor...");
        status.setTextColor(Color.rgb(70, 80, 90));
        executor.execute(() -> {
            try {
                JSONObject response = requestLogin(server, port, username, password);
                JSONObject user = response.optJSONObject("user");
                String role = user == null ? "operator" : user.optString("role", "operator");
                saveCachedUser(username, password, role);
                ensureDeviceToken(server, port);
                JSONArray locations = fetchLocations(server, port);
                cacheLocations(locations);
                try { cacheDevices(fetchDevices(server, port)); } catch (Exception ignored) { }
                syncPendingReadings();
                runOnUiThread(() -> { qrLoginInProgress = false; showHome(username, role, true, locations); });
            } catch (Exception error) {
                if (qrLoginInProgress) {
                    runOnUiThread(() -> {
                        qrLoginInProgress = false;
                        status.setText(error.getMessage() != null && error.getMessage().contains("HTTP 401") ? "QR Code recusado: usuário ou senha inválidos." : "QR Code lido, mas não foi possível autenticar no servidor.");
                        status.setTextColor(ERROR);
                    });
                } else if (matchesCachedUser(username, password)) {
                    JSONArray locations = readCachedLocations();
                    runOnUiThread(() -> showHome(username, prefs.getString("role", "operator"), false, locations));
                } else {
                    runOnUiThread(() -> {
                        status.setText("Não foi possível conectar e não há acesso offline salvo.");
                        status.setTextColor(Color.rgb(180, 50, 50));
                    });
                }
            }
        });
    }

    private void loginFromQr(String scanned) {
        if (!scanned.startsWith("!")) {
            if (status != null) status.setText("QR Code inválido. Use o formato !usuario!senha.");
            return;
        }
        int separator = scanned.indexOf('!', 1);
        if (separator <= 1 || separator >= scanned.length() - 1) {
            if (status != null) status.setText("QR Code inválido. Use o formato !usuario!senha.");
            return;
        }
        String username = scanned.substring(1, separator).trim();
        String password = scanned.substring(separator + 1).trim();
        if (username.isEmpty() || password.isEmpty()) {
            if (status != null) status.setText("QR Code sem credenciais completas.");
            return;
        }
        userInput.setText(username);
        passwordInput.setText(password);
        qrLoginInProgress = true;
        if (status != null) {
            status.setText("QR Code lido. Autenticando operador...");
            status.setTextColor(SUCCESS);
        }
        login();
    }

    private JSONObject requestLogin(String server, String port, String username, String password) throws Exception {
        String host = server.startsWith("http://") || server.startsWith("https://") ? server : "http://" + server;
        URL url = new URL(host.replaceAll("/$", "") + ":" + port + "/api/auth/login");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(10000);
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        String body = new JSONObject().put("username", username).put("password", password).toString();
        try (OutputStream output = connection.getOutputStream()) {
            output.write(body.getBytes(StandardCharsets.UTF_8));
        }
        int code = connection.getResponseCode();
        String cookie = connection.getHeaderField("Set-Cookie");
        if (cookie == null) {
            List<String> cookies = connection.getHeaderFields().get("Set-Cookie");
            if (cookies != null && !cookies.isEmpty()) cookie = cookies.get(0);
        }
        if (cookie != null) prefs.edit().putString("session_cookie", cookie.split(";", 2)[0]).apply();
        InputStream stream = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String responseBody = read(stream);
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code + " " + responseBody);
        return new JSONObject(responseBody);
    }

    private JSONArray fetchLocations(String server, String port) throws Exception {
        HttpURLConnection connection = open(server, port, "/api/locations?limit=100&offset=0", "GET");
        int code = connection.getResponseCode();
        String body = read(code >= 400 ? connection.getErrorStream() : connection.getInputStream());
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code + " " + body);
        return new JSONObject(body).optJSONArray("items");
    }

    private JSONArray fetchDevices(String server, String port) throws Exception {
        HttpURLConnection connection = open(server, port, "/api/devices?limit=100&offset=0", "GET");
        int code = connection.getResponseCode();
        String body = read(code >= 400 ? connection.getErrorStream() : connection.getInputStream());
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code + " " + body);
        return new JSONObject(body).optJSONArray("items");
    }

    private void cacheDevices(JSONArray devices) {
        if (devices != null) prefs.edit().putString("devices_json", devices.toString()).apply();
    }

    private void sendReading(JSONObject event) throws Exception {
        String server = prefs.getString("server", "");
        String port = prefs.getString("port", "3333");
        HttpURLConnection connection = open(server, port, "/api/device/readings", "POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + prefs.getString("device_token", ""));
        try (OutputStream output = connection.getOutputStream()) { output.write(event.toString().getBytes(StandardCharsets.UTF_8)); }
        int code = connection.getResponseCode();
        String body = read(code >= 400 ? connection.getErrorStream() : connection.getInputStream());
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code + " " + body);
    }

    private HttpURLConnection open(String server, String port, String path, String method) throws Exception {
        String host = server.startsWith("http://") || server.startsWith("https://") ? server : "http://" + server;
        HttpURLConnection connection = (HttpURLConnection) new URL(host.replaceAll("/$", "") + ":" + port + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(10000);
        String cookie = prefs.getString("session_cookie", "");
        if (!cookie.isEmpty()) connection.setRequestProperty("Cookie", cookie);
        return connection;
    }

    private void cacheLocations(JSONArray locations) {
        if (locations != null) prefs.edit().putString("locations_json", locations.toString()).apply();
    }

    private JSONArray readCachedLocations() {
        try { return new JSONArray(prefs.getString("locations_json", "[]")); }
        catch (Exception error) { return new JSONArray(); }
    }

    private void enqueueReading(JSONObject event) {
        try {
            JSONArray pending = new JSONArray(prefs.getString("pending_readings", "[]"));
            pending.put(event);
            prefs.edit().putString("pending_readings", pending.toString()).apply();
        } catch (Exception ignored) { }
    }

    private void syncPendingReadings() {
        try {
            JSONArray pending = new JSONArray(prefs.getString("pending_readings", "[]"));
            JSONArray remaining = new JSONArray();
            for (int i = 0; i < pending.length(); i++) {
                JSONObject event = pending.optJSONObject(i);
                try { if (event == null) throw new Exception("Leitura inválida"); sendReading(event); }
                catch (Exception error) { if (event != null) remaining.put(event); }
            }
            prefs.edit().putString("pending_readings", remaining.toString()).apply();
        } catch (Exception ignored) { }
    }

    private void showHome(String username, String role, boolean online, JSONArray locations) {
        if (!"admin".equalsIgnoreCase(role)) {
            showLocationSelection(username, online, locations);
            return;
        }
        activateSession();
        content.removeAllViews();
        content.addView(header("Área Administrativa"), params(WRAP, dp(62)));
        content.addView(statusBadge(online ? "Conectado" : "Sem conexão", online ? SUCCESS : WARNING), params(WRAP, dp(42)));
        content.addView(text("Usuário: " + username + "\nPerfil: " + role, 17, INK), params(WRAP, dp(72)));
        content.addView(text("Administrador autenticado. Use as configurações para revisar o coletor.", 16, MUTED), params(WRAP, dp(74)));
        if ("admin".equalsIgnoreCase(role)) {
            Button settings = secondaryButton("Configurações");
            settings.setOnClickListener(v -> showConfig());
            content.addView(settings, params(WRAP, dp(56)));
            Button logs = secondaryButton("Logs do coletor");
            logs.setOnClickListener(v -> showLogs());
            content.addView(logs, params(WRAP, dp(56)));
        }
        Button logout = secondaryButton("Sair");
        logout.setOnClickListener(v -> showLogin());
        content.addView(logout, params(WRAP, dp(56)));
    }

    private void showLocationSelection(String username, boolean online, JSONArray locations) {
        operatorLocations = locations == null ? new JSONArray() : locations;
        content.removeAllViews();
        content.addView(header("Seleção do Local"), params(WRAP, dp(62)));
        content.addView(text("Operador: " + username, 16, INK), params(WRAP, dp(38)));
        content.addView(statusBadge(online ? "Conectado · catálogo atualizado" : "Sem rede: usando locais salvos no coletor", online ? SUCCESS : WARNING), params(WRAP, dp(48)));
        locationSpinner = new Spinner(this);
        String[] names = new String[Math.max(operatorLocations.length() + 1, 1)];
        names[0] = operatorLocations.length() == 0 ? "Nenhum local cadastrado" : "Selecione um local";
        for (int i = 0; i < operatorLocations.length(); i++) names[i + 1] = operatorLocations.optJSONObject(i).optString("name", "Local");
        locationSpinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, names));
        content.addView(locationSpinner, params(WRAP, dp(62)));
        Button continueButton = button("Continuar para as leituras");
        continueButton.setEnabled(false);
        locationSpinner.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) { continueButton.setEnabled(position > 0); }
            public void onNothingSelected(android.widget.AdapterView<?> parent) { continueButton.setEnabled(false); }
        });
        continueButton.setOnClickListener(v -> {
            int selectedPosition = locationSpinner.getSelectedItemPosition();
            if (selectedPosition <= 0) return;
            JSONObject selected = operatorLocations.optJSONObject(selectedPosition - 1);
            if (selected == null || selected.optString("id", "").isEmpty()) return;
            prefs.edit().putString("last_location_id", selected.optString("id")).apply();
            showOperator(username, online, operatorLocations);
        });
        content.addView(continueButton, params(WRAP, dp(58)));
        TextView message = text(operatorLocations.length() == 0 ? "Nenhum local ativo foi disponibilizado pelo sistema." : "O local poderá ser alterado durante o trabalho.", 14, MUTED);
        message.setPadding(0, dp(12), 0, 0);
        content.addView(message, params(WRAP, dp(70)));
        Button logout = secondaryButton("Sair");
        logout.setOnClickListener(v -> showLogin());
        content.addView(logout, params(WRAP, dp(56)));
    }

    private void showOperator(String username, boolean online, JSONArray locations) {
        activateSession();
        operatorLocations = locations == null ? new JSONArray() : locations;
        content.removeAllViews();
        content.addView(header("Leituras"), params(WRAP, dp(62)));
        content.addView(text("Operador: " + username, 16, INK), params(WRAP, dp(38)));
        operatorConnection = statusBadge(online ? "Conectado" : "Sem conexão", online ? SUCCESS : WARNING);
        content.addView(operatorConnection, params(WRAP, dp(42)));
        content.addView(text("Local da leitura", 14, Color.DKGRAY), params(WRAP, dp(30)));
        locationSpinner = new Spinner(this);
        String[] names = new String[Math.max(operatorLocations.length() + 1, 1)];
        names[0] = operatorLocations.length() == 0 ? "Nenhum local atribuído ao usuário" : "Selecione um local";
        for (int i = 0; i < operatorLocations.length(); i++) names[i + 1] = operatorLocations.optJSONObject(i).optString("name", "Local");
        locationSpinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, names));
        String lastLocationId = prefs.getString("last_location_id", "");
        for (int i = 0; i < operatorLocations.length(); i++) {
            if (lastLocationId.equals(operatorLocations.optJSONObject(i).optString("id", ""))) { locationSpinner.setSelection(i + 1); break; }
        }
        locationSpinner.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                if (position > 0 && position - 1 < operatorLocations.length()) prefs.edit().putString("last_location_id", operatorLocations.optJSONObject(position - 1).optString("id", "")).apply();
            }
            public void onNothingSelected(android.widget.AdapterView<?> parent) { }
        });
        content.addView(locationSpinner, params(WRAP, dp(58)));
        codeInput = field("Código lido pelo Zebra", "", InputType.TYPE_CLASS_TEXT);
        content.addView(codeInput, params(WRAP, dp(64)));
        Button read = button("Registrar leitura");
        read.setOnClickListener(v -> recordReading(operatorConnection));
        content.addView(read, params(WRAP, dp(58)));
        content.addView(text("As leituras sem conexão ficam pendentes neste coletor e serão sincronizadas quando a conexão retornar.", 14, MUTED), params(WRAP, dp(70)));
        Button logout = secondaryButton("Sair");
        logout.setOnClickListener(v -> showLogin());
        content.addView(logout, params(WRAP, dp(56)));
    }

    private void recordReading(TextView connection) {
        String code = codeInput.getText().toString().trim();
        if (code.isEmpty() || operatorLocations.length() == 0 || locationSpinner.getSelectedItemPosition() <= 0) {
            connection.setText("Informe um código e selecione um local.");
            connection.setTextColor(Color.rgb(180, 50, 50));
            return;
        }
        JSONObject location = operatorLocations.optJSONObject(locationSpinner.getSelectedItemPosition() - 1);
        String locationId = location == null ? "" : location.optString("id", "");
        JSONObject event = new JSONObject();
        try {
            event.put("device_event_id", UUID.randomUUID().toString());
            event.put("code", code);
            event.put("location_id", locationId);
            event.put("occurred_at", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).format(new Date()));
        } catch (Exception error) {
            connection.setText("Não foi possível preparar a leitura.");
            return;
        }
        codeInput.setText("");
        executor.execute(() -> {
            try {
                if (prefs.getString("device_token", "").isEmpty()) throw new Exception("Token não configurado");
                sendReading(event);
                appendLog("Leitura enviada: " + code);
                runOnUiThread(() -> { connection.setText("Leitura enviada ao servidor."); connection.setTextColor(Color.rgb(35, 130, 75)); });
            } catch (Exception error) {
                enqueueReading(event);
                appendLog("Leitura pendente: " + code + " (" + error.getMessage() + ")");
                runOnUiThread(() -> { connection.setText("Sem comunicação: leitura salva no coletor."); connection.setTextColor(Color.rgb(180, 100, 20)); });
            }
        });
    }

    private void activateSession() { sessionActive = true; resetInactivity(); handler.removeCallbacks(syncLoop); handler.postDelayed(syncLoop, 15000); }
    private void resetInactivity() { handler.removeCallbacks(inactivityLogout); handler.postDelayed(inactivityLogout, 5 * 60 * 1000L); }

    private void configureDataWedge() {
        Intent create = new Intent("com.symbol.datawedge.api.ACTION");
        create.putExtra("com.symbol.datawedge.api.CREATE_PROFILE", "SecureLog");
        sendBroadcast(create);
        handler.postDelayed(this::configureDataWedgeProfile, 800);
    }

    private void configureDataWedgeProfile() {
        Bundle app = new Bundle();
        app.putString("PACKAGE_NAME", getPackageName());
        app.putStringArray("ACTIVITY_LIST", new String[]{"*"});
        Bundle profile = new Bundle();
        profile.putString("PROFILE_NAME", "SecureLog");
        profile.putString("PROFILE_ENABLED", "true");
        profile.putString("CONFIG_MODE", "UPDATE");
        profile.putParcelableArray("APP_LIST", new Bundle[]{app});
        Bundle barcode = new Bundle();
        barcode.putString("PLUGIN_NAME", "BARCODE");
        Bundle barcodeParams = new Bundle();
        barcodeParams.putString("scanner_selection", "auto");
        barcodeParams.putString("decoder_qrcode", "true");
        barcodeParams.putString("decoder_code128", "true");
        barcodeParams.putString("decoder_code39", "true");
        barcodeParams.putString("decoder_ean8", "true");
        barcodeParams.putString("decoder_ean13", "true");
        barcode.putBundle("PARAM_LIST", barcodeParams);
        profile.putBundle("PLUGIN_CONFIG", barcode);
        sendBroadcast(setDataWedgeConfig(profile));
        Bundle profileConfig = new Bundle();
        profileConfig.putString("PROFILE_NAME", "SecureLog");
        profileConfig.putString("PROFILE_ENABLED", "true");
        profileConfig.putString("CONFIG_MODE", "UPDATE");
        profileConfig.putString("PLUGIN_NAME", "INTENT");
        Bundle intentConfig = new Bundle();
        intentConfig.putString("intent_output_enabled", "true");
        intentConfig.putString("intent_action", "com.symbol.datawedge.data_string");
        intentConfig.putString("intent_category", "android.intent.category.DEFAULT");
        intentConfig.putString("intent_delivery", "2");
        profileConfig.putBundle("PARAM_LIST", intentConfig);
        sendBroadcast(setDataWedgeConfig(profileConfig));

        Bundle keyboardConfig = new Bundle();
        keyboardConfig.putString("PROFILE_NAME", "SecureLog");
        keyboardConfig.putString("PROFILE_ENABLED", "true");
        keyboardConfig.putString("CONFIG_MODE", "UPDATE");
        keyboardConfig.putString("PLUGIN_NAME", "KEYSTROKE");
        Bundle keyboardParams = new Bundle();
        keyboardParams.putString("keystroke_output_enabled", "false");
        keyboardConfig.putBundle("PARAM_LIST", keyboardParams);
        sendBroadcast(setDataWedgeConfig(keyboardConfig));
    }

    private Intent setDataWedgeConfig(Bundle config) {
        Intent intent = new Intent("com.symbol.datawedge.api.ACTION");
        intent.putExtra("com.symbol.datawedge.api.SET_CONFIG", config);
        return intent;
    }

    private void applyKioskMode() {
        if (Build.VERSION.SDK_INT < 21) return;
        DevicePolicyManager policy = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
        if (policy == null || !policy.isDeviceOwnerApp(getPackageName())) return;
        try {
            policy.setLockTaskPackages(new ComponentName(this, SecureLogDeviceAdminReceiver.class), new String[]{getPackageName()});
            startLockTask();
        } catch (Exception ignored) { }
    }

    private void requestKioskExit() {
        EditText password = field("Senha administrativa local", "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        new AlertDialog.Builder(this).setTitle("Liberar aparelho").setMessage("Informe a senha administrativa para sair do modo bloqueado.")
                .setView(password).setNegativeButton("Cancelar", null).setPositiveButton("Liberar", (dialog, which) -> {
                    if ("zebra123".equals(password.getText().toString())) stopKioskMode();
                    else if (configStatus != null) { configStatus.setText("Senha administrativa inválida."); configStatus.setTextColor(ERROR); }
                }).show();
    }

    private void stopKioskMode() {
        if (Build.VERSION.SDK_INT >= 21) { try { stopLockTask(); } catch (Exception ignored) { } }
        if (configStatus != null) { configStatus.setText("Modo bloqueado liberado neste aparelho."); configStatus.setTextColor(SUCCESS); }
    }

    private void showLogs() {
        String logs = prefs.getString("local_logs", "Nenhum evento registrado.");
        new AlertDialog.Builder(this).setTitle("Logs do coletor").setMessage(logs).setPositiveButton("Fechar", null).show();
    }

    private void appendLog(String message) {
        String line = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()).format(new Date()) + " - " + message;
        String logs = prefs.getString("local_logs", "");
        String updated = (logs.isEmpty() ? line : logs + "\n" + line);
        if (updated.length() > 12000) updated = updated.substring(updated.length() - 12000);
        prefs.edit().putString("local_logs", updated).apply();
    }

    private void appendDiagnostic(String message) {
        Log.i(LOG_TAG, message);
        prefs.edit().putString("last_scan_debug", message).apply();
        appendLog(message);
        if (scannerDiagnostic != null) runOnUiThread(() -> scannerDiagnostic.setText("Scanner: " + message));
    }

    private void requestConfigAccess() {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(24), 0, dp(24), 0);
        EditText username = field("Usuário administrador", "admin", InputType.TYPE_CLASS_TEXT);
        EditText password = field("Senha local", "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        form.addView(username, params(WRAP, dp(58)));
        form.addView(password, params(WRAP, dp(58)));
        new AlertDialog.Builder(this)
                .setTitle("Acesso às configurações")
                .setMessage("Use o administrador local ou uma conta administradora do sistema.")
                .setView(form)
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Continuar", (dialog, which) -> {
                    if ("admin".equals(username.getText().toString().trim()) && "zebra123".equals(password.getText().toString())) {
                        showConfig();
                    } else {
                        status.setText("Usuário ou senha de configuração inválidos.");
                        status.setTextColor(Color.rgb(180, 50, 50));
                    }
                }).show();
    }

    private void showConfig() {
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(20), dp(20), dp(20), dp(24));
        content.setBackgroundColor(BG);
        content.addView(header("Configurações"), params(WRAP, dp(62)));
        content.addView(text("Configuração da API", 20, INK), params(WRAP, dp(38)));
        content.addView(text("Essas informações ficam armazenadas somente neste coletor.", 14, MUTED), params(WRAP, dp(42)));
        configServerInput = field("Endereço do servidor", prefs.getString("server", ""), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        configPortInput = field("Porta da API", prefs.getString("port", "3333"), InputType.TYPE_CLASS_NUMBER);
        configDeviceInput = field("Nome do coletor", prefs.getString("device_name", ""), InputType.TYPE_CLASS_TEXT);
        configTokenInput = field("Token do coletor (protegido)", prefs.getString("device_token", ""), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        content.addView(configServerInput, params(WRAP, dp(58)));
        content.addView(configPortInput, params(WRAP, dp(58)));
        content.addView(configDeviceInput, params(WRAP, dp(58)));
        content.addView(text("Número de série automático: " + getDeviceSerial(), 14, Color.DKGRAY), params(WRAP, dp(42)));
        content.addView(configTokenInput, params(WRAP, dp(58)));
        Button save = button("Salvar configurações");
        save.setOnClickListener(v -> saveConfig());
        content.addView(save, params(WRAP, dp(56)));
        Button back = secondaryButton("Voltar para o login");
        back.setOnClickListener(v -> showLogin());
        content.addView(back, params(WRAP, dp(56)));
        Button unlock = secondaryButton("Liberar aparelho");
        unlock.setOnClickListener(v -> requestKioskExit());
        content.addView(unlock, params(WRAP, dp(56)));
        configStatus = text("", 14, Color.DKGRAY);
        configStatus.setPadding(0, dp(12), 0, 0);
        content.addView(configStatus, params(WRAP, dp(64)));
        setContentView(scroll(content));
    }

    private void saveConfig() {
        String server = configServerInput.getText().toString().trim();
        String port = configPortInput.getText().toString().trim();
        String name = configDeviceInput.getText().toString().trim();
        String serial = getDeviceSerial();
        if (server.isEmpty() || port.isEmpty() || name.isEmpty()) {
            new AlertDialog.Builder(this).setTitle("Configuração incompleta").setMessage("Informe o endereço, a porta e o nome do coletor.").setPositiveButton("OK", null).show();
            return;
        }
        prefs.edit().putString("server", server).putString("port", port)
                .putString("device_name", name).putString("serial_number", serial)
                .putString("device_token", configTokenInput.getText().toString().trim()).apply();
        configStatus.setText("Registrando este coletor no servidor...");
        executor.execute(() -> {
            try {
                JSONObject registration = registerCollector(server, port, name, serial);
                String statusValue = registration.optString("status", "pending");
                String message = statusValue.equals("associated") ? "Conexão bem-sucedida. Coletor associado e autorizado." : "Conexão bem-sucedida. Aguardando associação no painel web.";
                prefs.edit().putString("provision_status", message).apply();
                runOnUiThread(() -> configStatus.setText(message));
                if ("pending".equals(statusValue)) pollPairing(server, port);
            } catch (Exception error) {
                String message = "Falha de conexão com o servidor. Verifique endereço, porta e rede.";
                prefs.edit().putString("provision_status", message).apply();
                runOnUiThread(() -> configStatus.setText(message));
            }
        });
        configStatus.setText("Salvando configuração e testando conexão...");
    }

    private JSONObject registerCollector(String server, String port, String name, String serial) throws Exception {
        HttpURLConnection connection = open(server, port, "/api/device/register", "POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        JSONObject body = new JSONObject().put("name", name).put("serial_number", serial);
        try (OutputStream output = connection.getOutputStream()) { output.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        int code = connection.getResponseCode();
        String response = read(code >= 400 ? connection.getErrorStream() : connection.getInputStream());
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code + " " + response);
        JSONObject result = new JSONObject(response);
        prefs.edit().putString("device_id", result.optString("device_id", ""))
                .putString("pairing_code", result.optString("pairing_code", "")).apply();
        if ("associated".equals(result.optString("status")) && result.has("token")) {
            prefs.edit().putString("device_token", result.optString("token", "")).remove("pairing_code").apply();
            prefs.edit().putString("provision_status", "Conexão bem-sucedida. Coletor associado e autorizado.").apply();
        }
        return result;
    }

    private void ensureDeviceToken(String server, String port) {
        if (!prefs.getString("device_token", "").isEmpty()) return;
        try {
            JSONObject result = registerCollector(server, port, prefs.getString("device_name", "SecureLog Zebra"), getDeviceSerial());
            if ("pending".equals(result.optString("status"))) pollPairing(server, port);
        } catch (Exception ignored) { }
    }

    private void pollPairing(String server, String port) {
        executor.execute(() -> {
            for (int attempt = 0; attempt < 60; attempt++) {
                try {
                    String deviceId = prefs.getString("device_id", "");
                    String pairingCode = prefs.getString("pairing_code", "");
                    if (deviceId.isEmpty() || pairingCode.isEmpty()) return;
                    HttpURLConnection connection = open(server, port, "/api/device/pairing/" + deviceId, "GET");
                    connection.setRequestProperty("X-Pairing-Code", pairingCode);
                    int code = connection.getResponseCode();
                    String response = read(code >= 400 ? connection.getErrorStream() : connection.getInputStream());
                    if (code == 200) {
                        JSONObject payload = new JSONObject(response);
                        if ("associated".equals(payload.optString("status")) && payload.has("token")) {
                            prefs.edit().putString("device_token", payload.getString("token")).remove("pairing_code").apply();
                            String message = "Conexão bem-sucedida. Coletor associado e token recebido.";
                            prefs.edit().putString("provision_status", message).apply();
                            runOnUiThread(() -> { if (configStatus != null) configStatus.setText(message); });
                            return;
                        }
                    }
                } catch (Exception ignored) { }
                try { Thread.sleep(5000); } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); return; }
            }
        });
    }

    private String getDeviceSerial() {
        String serial = "";
        try { serial = Build.getSerial(); } catch (Exception ignored) { }
        if (serial == null || serial.isEmpty() || "unknown".equalsIgnoreCase(serial)) serial = Build.SERIAL;
        if (serial == null || serial.isEmpty() || "unknown".equalsIgnoreCase(serial)) serial = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        return serial == null || serial.isEmpty() ? "securelog-" + Build.MODEL : serial;
    }

    private void saveCachedUser(String username, String password, String role) {
        prefs.edit().putString("cached_user", username).putString("password_hash", hash(password)).putString("role", role).apply();
    }

    private boolean matchesCachedUser(String username, String password) {
        return username.equals(prefs.getString("cached_user", "")) && hash(password).equals(prefs.getString("password_hash", ""));
    }

    private String hash(String value) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : bytes) result.append(String.format("%02x", b));
            return result.toString();
        } catch (Exception error) { return ""; }
    }

    private String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder result = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) result.append(line);
        }
        return result.toString();
    }

    private EditText field(String hint, String value, int inputType) {
        EditText field = new EditText(this);
        field.setHint(hint);
        field.setText(value);
        field.setTextSize(17);
        field.setTextColor(INK);
        field.setHintTextColor(Color.rgb(120, 130, 140));
        field.setSingleLine(true);
        field.setInputType(inputType);
        field.setPadding(dp(12), 0, dp(12), 0);
        field.setBackground(roundRect(WHITE, Color.rgb(190, 198, 207), 1, 10));
        return field;
    }

    private Button button(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(16);
        button.setTextColor(WHITE);
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setPadding(dp(12), 0, dp(12), 0);
        button.setBackground(roundRect(ORANGE, ORANGE, 0, 10));
        return button;
    }

    private Button secondaryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(16);
        button.setTextColor(INK);
        button.setAllCaps(false);
        button.setMinHeight(0);
        button.setPadding(dp(12), 0, dp(12), 0);
        button.setBackground(roundRect(WHITE, Color.rgb(165, 175, 185), 1, 10));
        return button;
    }

    private View header() { return header("SecureLog"); }

    private View header(String title) {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(16), 0, dp(16), 0);
        bar.setBackground(roundRect(ORANGE, ORANGE, 0, 0));
        TextView brand = text("Big Dutchman", 18, WHITE);
        brand.setTypeface(null, 1);
        bar.addView(brand, new LinearLayout.LayoutParams(0, WRAP, 1));
        TextView divider = text("|", 18, Color.rgb(255, 220, 185));
        bar.addView(divider, params(dp(20), WRAP));
        TextView product = text(title, 17, WHITE);
        product.setTypeface(null, 1);
        bar.addView(product, new LinearLayout.LayoutParams(0, WRAP, 1));
        return bar;
    }

    private TextView statusBadge(String value, int color) {
        TextView badge = text(value, 14, color);
        badge.setTypeface(null, 1);
        badge.setGravity(Gravity.CENTER_VERTICAL);
        badge.setPadding(dp(12), 0, dp(12), 0);
        int fill = color == SUCCESS ? Color.rgb(225, 243, 231) : color == ERROR ? Color.rgb(250, 230, 230) : Color.rgb(255, 235, 204);
        badge.setBackground(roundRect(fill, fill, 0, 8));
        return badge;
    }

    private GradientDrawable roundRect(int fill, int stroke, int strokeWidth, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        if (strokeWidth > 0) drawable.setStroke(dp(strokeWidth), stroke);
        return drawable;
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        return view;
    }

    private ScrollView scroll(View view) { ScrollView scroll = new ScrollView(this); scroll.addView(view); return scroll; }
    private LinearLayout.LayoutParams params(int width, int height) { return new LinearLayout.LayoutParams(width, height); }
    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density + 0.5f); }
    private static final int WRAP = ViewGroup.LayoutParams.MATCH_PARENT;

    @Override protected void onDestroy() { executor.shutdownNow(); super.onDestroy(); }
}
