package br.com.bigdutchman.securelog.nativecollector;

import android.app.Activity;
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

        serverInput = field("Servidor da API", prefs.getString("server", "192.168.1.16"), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        portInput = field("Porta", prefs.getString("port", "3333"), InputType.TYPE_CLASS_NUMBER);
        userInput = field("Usuário", prefs.getString("last_user", ""), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        passwordInput = field("Senha", "", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);

        content.addView(serverInput, params(WRAP, dp(58)));
        content.addView(portInput, params(WRAP, dp(58)));
        content.addView(userInput, params(WRAP, dp(58)));
        content.addView(passwordInput, params(WRAP, dp(58)));

        Button login = button("Entrar");
        login.setOnClickListener(v -> login());
        content.addView(login, params(WRAP, dp(56)));

        status = text("", 14, Color.DKGRAY);
        status.setPadding(0, dp(14), 0, 0);
        content.addView(status, params(WRAP, dp(70)));
        setContentView(scroll(content));
    }

    private void login() {
        String server = serverInput.getText().toString().trim();
        String port = portInput.getText().toString().trim();
        String username = userInput.getText().toString().trim();
        String password = passwordInput.getText().toString();
        if (server.isEmpty() || port.isEmpty() || username.isEmpty() || password.isEmpty()) {
            status.setText("Preencha servidor, porta, usuário e senha.");
            status.setTextColor(Color.rgb(180, 50, 50));
            return;
        }
        prefs.edit().putString("server", server).putString("port", port).putString("last_user", username).apply();
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
        Button logout = button("Sair");
        logout.setOnClickListener(v -> showLogin());
        content.addView(logout, params(WRAP, dp(56)));
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
