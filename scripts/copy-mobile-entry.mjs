import {copyFile} from "node:fs/promises";

await copyFile("capacitor-web/mobile-index.html", "capacitor-web/index.html");
