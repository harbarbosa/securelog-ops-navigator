package br.com.bigdutchman.securelog.nativecollector;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

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
    private TextView status;
    private LinearLayout content;
    private SharedPreferences prefs;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        showLogin();
    }

    private void showLogin() {
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
                runOnUiThread(() -> showHome(username, role, true));
            } catch (Exception error) {
                if (matchesCachedUser(username, password)) {
                    runOnUiThread(() -> showHome(username, prefs.getString("role", "operator"), false));
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
        InputStream stream = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String responseBody = read(stream);
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code + " " + responseBody);
        return new JSONObject(responseBody);
    }

    private void showHome(String username, String role, boolean online) {
        content.removeAllViews();
        TextView title = text("SecureLog Coletor", 26, Color.rgb(235, 118, 0));
        title.setTypeface(null, 1);
        content.addView(title, params(WRAP, dp(50)));
        content.addView(text(online ? "Conectado ao servidor" : "Modo offline", 16, online ? Color.rgb(35, 130, 75) : Color.rgb(180, 100, 20)), params(WRAP, dp(42)));
        content.addView(text("Usuário: " + username + "\nPerfil: " + role, 17, Color.DKGRAY), params(WRAP, dp(72)));
        content.addView(text("A próxima etapa adicionará a seleção do local e o recebimento das leituras Zebra.", 16, Color.DKGRAY), params(WRAP, dp(90)));
        if ("admin".equalsIgnoreCase(role)) {
            Button settings = button("Configurações");
            settings.setOnClickListener(v -> showConfig());
            content.addView(settings, params(WRAP, dp(56)));
        }
        Button logout = button("Sair");
        logout.setOnClickListener(v -> showLogin());
        content.addView(logout, params(WRAP, dp(56)));
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
        content.addView(configTokenInput, params(WRAP, dp(58)));
        Button save = button("Salvar configurações");
        save.setOnClickListener(v -> saveConfig());
        content.addView(save, params(WRAP, dp(56)));
        Button back = button("Voltar para o login");
        back.setOnClickListener(v -> showLogin());
        content.addView(back, params(WRAP, dp(56)));
        setContentView(scroll(content));
    }

    private void saveConfig() {
        String server = configServerInput.getText().toString().trim();
        String port = configPortInput.getText().toString().trim();
        if (server.isEmpty() || port.isEmpty()) {
            new AlertDialog.Builder(this).setTitle("Configuração incompleta").setMessage("Informe o endereço e a porta do servidor.").setPositiveButton("OK", null).show();
            return;
        }
        prefs.edit().putString("server", server).putString("port", port)
                .putString("device_name", configDeviceInput.getText().toString().trim())
                .putString("device_token", configTokenInput.getText().toString().trim()).apply();
        new AlertDialog.Builder(this).setTitle("Configurações salvas").setMessage("O coletor está pronto para tentar o login.").setPositiveButton("OK", (dialog, which) -> showLogin()).show();
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
