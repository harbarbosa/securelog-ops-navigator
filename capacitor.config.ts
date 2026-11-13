import type {CapacitorConfig} from "@capacitor/cli";

const serverUrl=process.env.CAPACITOR_SERVER_URL?.trim();

const config:CapacitorConfig={
 appId:"br.com.bigdutchman.securelog",
 appName:"Big Dutchman SecureLog",
 webDir:"capacitor-web",
 ...(serverUrl?{server:{url:serverUrl,cleartext:serverUrl.startsWith("http://")}}:{}),
 android:{backgroundColor:"#f8f8f7"}
};

export default config;
