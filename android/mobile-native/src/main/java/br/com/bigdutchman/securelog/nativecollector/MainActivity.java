package br.com.bigdutchman.securelog.nativecollector;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Build;
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
    private boolean receiverRegistered;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable inactivityLogout = () -> { if (sessionActive) showLogin(); };
    private final Runnable syncLoop = new Runnable() {
        @Override public void run() { if (sessionActive) { executor.execute(MainActivity.this::syncPendingReadings); handler.postDelayed(this, 15000); } }
    };
    private final BroadcastReceiver zebraReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            String code = intent.getStringExtra("com.symbol.datawedge.data_string");
            if (code != null && !code.trim().isEmpty() && sessionActive && codeInput != null) {
                codeInput.setText(code.trim());
                if (operatorConnection != null) recordReading(operatorConnection);
            }
        }
    };
    private TextView status;
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
    }

    @Override public boolean dispatchTouchEvent(MotionEvent event) {
        if (sessionActive && event.getAction() == MotionEvent.ACTION_DOWN) resetInactivity();
        return super.dispatchTouchEvent(event);
    }

    @Override protected void onResume() {
        super.onResume();
        if (!receiverRegistered) {
            IntentFilter filter = new IntentFilter();
            filter.addAction("com.symbol.datawedge.data_string");
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
        content.setPadding(dp(24), dp(36), dp(24), dp(24));
        content.setBackgroundColor(Color.rgb(247, 248, 250));

        TextView brand = text("SecureLog", 30, Color.rgb(235, 118, 0));
        brand.setTypeface(null, 1);
        content.addView(brand, params(WRAP, dp(48)));
        TextView title = text("Acesso do coletor", 22, Color.rgb(31, 38, 46));
        content.addView(title, params(WRAP, dp(42)));
        TextView subtitle = text("Entre com sua conta para iniciar as leituras.", 15, Color.DKGRAY);
        content.addView(subtitle, params(WRAP, dp(36)));

        userInput = field("Usuário", prefs.getString("last_user", ""), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        passwordInput = field("Senha", "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);

        content.addView(userInput, params(WRAP, dp(58)));
        content.addView(passwordInput, params(WRAP, dp(58)));

        Button login = button("Entrar");
        login.setOnClickListener(v -> login());
        content.addView(login, params(WRAP, dp(56)));

        Button settings = button("Configurações");
        settings.setOnClickListener(v -> requestConfigAccess());
        content.addView(settings, params(WRAP, dp(56)));

        status = text("", 14, Color.DKGRAY);
        status.setPadding(0, dp(14), 0, 0);
        String provisioningStatus = prefs.getString("provision_status", "");
        if (!provisioningStatus.isEmpty()) status.setText(provisioningStatus);
        content.addView(status, params(WRAP, dp(70)));
        setContentView(scroll(content));
    }

    private void login() {
        String server = prefs.getString("server", "").trim();
        String port = prefs.getString("port", "").trim();
        String username = userInput.getText().toString().trim();
        String password = passwordInput.getText().toString();
        if (server.isEmpty() || port.isEmpty()) {
            status.setText("Configure o servidor antes de entrar.");
            status.setTextColor(Color.rgb(180, 100, 20));
            return;
        }
        if (username.isEmpty() || password.isEmpty()) {
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
                JSONArray locations = fetchLocations(server, port);
                cacheLocations(locations);
                try { cacheDevices(fetchDevices(server, port)); } catch (Exception ignored) { }
                syncPendingReadings();
                runOnUiThread(() -> showHome(username, role, true, locations));
            } catch (Exception error) {
                if (matchesCachedUser(username, password)) {
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
        activateSession();
        if (!"admin".equalsIgnoreCase(role)) {
            showOperator(username, online, locations);
            return;
        }
        content.removeAllViews();
        TextView title = text("SecureLog Coletor", 26, Color.rgb(235, 118, 0));
        title.setTypeface(null, 1);
        content.addView(title, params(WRAP, dp(50)));
        content.addView(text(online ? "Conectado ao servidor" : "Modo offline", 16, online ? Color.rgb(35, 130, 75) : Color.rgb(180, 100, 20)), params(WRAP, dp(42)));
        content.addView(text("Usuário: " + username + "\nPerfil: " + role, 17, Color.DKGRAY), params(WRAP, dp(72)));
        content.addView(text("Administrador autenticado. Use as configurações para revisar o coletor.", 16, Color.DKGRAY), params(WRAP, dp(90)));
        if ("admin".equalsIgnoreCase(role)) {
            Button settings = button("Configurações");
            settings.setOnClickListener(v -> showConfig());
            content.addView(settings, params(WRAP, dp(56)));
            Button logs = button("Logs do coletor");
            logs.setOnClickListener(v -> showLogs());
            content.addView(logs, params(WRAP, dp(56)));
        }
        Button logout = button("Sair");
        logout.setOnClickListener(v -> showLogin());
        content.addView(logout, params(WRAP, dp(56)));
    }

    private void showOperator(String username, boolean online, JSONArray locations) {
        activateSession();
        operatorLocations = locations == null ? new JSONArray() : locations;
        content.removeAllViews();
        content.addView(text("Leituras SecureLog", 26, Color.rgb(235, 118, 0)), params(WRAP, dp(52)));
        content.addView(text("Operador: " + username, 16, Color.DKGRAY), params(WRAP, dp(38)));
        operatorConnection = text(online ? "Conectado ao servidor" : "Modo offline", 15, online ? Color.rgb(35, 130, 75) : Color.rgb(180, 100, 20));
        content.addView(operatorConnection, params(WRAP, dp(42)));
        content.addView(text("Local da leitura", 14, Color.DKGRAY), params(WRAP, dp(30)));
        locationSpinner = new Spinner(this);
        String[] names = new String[Math.max(operatorLocations.length(), 1)];
        for (int i = 0; i < operatorLocations.length(); i++) names[i] = operatorLocations.optJSONObject(i).optString("name", "Local");
        if (operatorLocations.length() == 0) names[0] = "Nenhum local atribuído ao usuário";
        locationSpinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, names));
        content.addView(locationSpinner, params(WRAP, dp(58)));
        codeInput = field("Código lido pelo Zebra", "", InputType.TYPE_CLASS_TEXT);
        content.addView(codeInput, params(WRAP, dp(64)));
        Button read = button("Registrar leitura");
        read.setOnClickListener(v -> recordReading(operatorConnection));
        content.addView(read, params(WRAP, dp(58)));
        content.addView(text("As leituras sem conexão ficam pendentes neste coletor e serão sincronizadas na próxima etapa.", 14, Color.DKGRAY), params(WRAP, dp(70)));
        Button logout = button("Sair");
        logout.setOnClickListener(v -> showLogin());
        content.addView(logout, params(WRAP, dp(56)));
    }

    private void recordReading(TextView connection) {
        String code = codeInput.getText().toString().trim();
        if (code.isEmpty() || operatorLocations.length() == 0) {
            connection.setText("Informe um código e selecione um local.");
            connection.setTextColor(Color.rgb(180, 50, 50));
            return;
        }
        JSONObject location = operatorLocations.optJSONObject(locationSpinner.getSelectedItemPosition());
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
        Bundle profileConfig = new Bundle();
        profileConfig.putString("PROFILE_NAME", "SecureLog");
        profileConfig.putString("PROFILE_ENABLED", "true");
        profileConfig.putString("CONFIG_MODE", "UPDATE");
        profileConfig.putString("PLUGIN_NAME", "INTENT");
        Bundle intentConfig = new Bundle();
        intentConfig.putString("intent_output_enabled", "true");
        intentConfig.putString("intent_action", "com.symbol.datawedge.data_string");
        intentConfig.putString("intent_delivery", "2");
        profileConfig.putBundle("PARAM_LIST", intentConfig);
        Intent configure = new Intent("com.symbol.datawedge.api.ACTION");
        configure.putExtra("com.symbol.datawedge.api.SET_CONFIG", profileConfig);
        sendBroadcast(configure);
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
        content.setPadding(dp(24), dp(36), dp(24), dp(24));
        content.setBackgroundColor(Color.rgb(247, 248, 250));
        content.addView(text("Configurações do coletor", 26, Color.rgb(235, 118, 0)), params(WRAP, dp(58)));
        content.addView(text("Essas informações ficam armazenadas somente neste coletor.", 14, Color.DKGRAY), params(WRAP, dp(48)));
        configServerInput = field("Endereço do servidor", prefs.getString("server", ""), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        configPortInput = field("Porta da API", prefs.getString("port", "3333"), InputType.TYPE_CLASS_NUMBER);
        configDeviceInput = field("Nome do coletor", prefs.getString("device_name", ""), InputType.TYPE_CLASS_TEXT);
        configTokenInput = field("Token do coletor", prefs.getString("device_token", ""), InputType.TYPE_CLASS_TEXT);
        content.addView(configServerInput, params(WRAP, dp(58)));
        content.addView(configPortInput, params(WRAP, dp(58)));
        content.addView(configDeviceInput, params(WRAP, dp(58)));
        content.addView(text("Número de série automático: " + getDeviceSerial(), 14, Color.DKGRAY), params(WRAP, dp(42)));
        content.addView(configTokenInput, params(WRAP, dp(58)));
        Button save = button("Salvar configurações");
        save.setOnClickListener(v -> saveConfig());
        content.addView(save, params(WRAP, dp(56)));
        Button back = button("Voltar para o login");
        back.setOnClickListener(v -> showLogin());
        content.addView(back, params(WRAP, dp(56)));
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
        if ("associated".equals(result.optString("status"))) prefs.edit().putString("device_token", prefs.getString("device_token", "")).apply();
        return result;
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
        field.setSingleLine(true);
        field.setInputType(inputType);
        field.setPadding(dp(12), 0, dp(12), 0);
        return field;
    }

    private Button button(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(16);
        return button;
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
