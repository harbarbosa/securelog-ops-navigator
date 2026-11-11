# SecureLog Recorder Helper

Helper Windows para playback por horário através do Intelbras NetSDK. Ele usa `CLIENT_PlayBackByTimeEx2` e não depende do índice CGI `mediaFileFind.cgi`.

Compile com:

```powershell
.\build.ps1 -SdkRoot "C:\caminho\para\SDK\NetSDK 3.050"
```

O executável recebe horários locais do gravador no formato `YYYY-MM-DD HH:mm:ss`. As DLLs do SDK são copiadas para `bin/win-x64` durante o build e não devem ser substituídas por DLLs de outra versão.
