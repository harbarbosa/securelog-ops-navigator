#include <windows.h>
#include <dhnetsdk.h>

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <io.h>
#include <fcntl.h>
#include <map>
#include <string>

struct Options {
    std::string host, user, password, output, start, end;
    int port = 37777;
    int channel = 0;
};

static std::map<std::string, std::string> parseArgs(int argc, char** argv) {
    std::map<std::string, std::string> values;
    for (int i = 1; i + 1 < argc; i += 2) values[argv[i]] = argv[i + 1];
    return values;
}

static bool parseTime(const std::string& value, NET_TIME& output) {
    unsigned year, month, day, hour, minute, second;
    if (sscanf_s(value.c_str(), "%u-%u-%u %u:%u:%u", &year, &month, &day, &hour, &minute, &second) != 6) return false;
    output = {};
    output.dwYear = year;
    output.dwMonth = month;
    output.dwDay = day;
    output.dwHour = hour;
    output.dwMinute = minute;
    output.dwSecond = second;
    return true;
}

static void CALLBACK disconnectCallback(LLONG, char*, LONG, LDWORD) {}

static int CALLBACK dataCallback(LLONG, DWORD dataType, BYTE* buffer, DWORD size, LDWORD user) {
    if (dataType != 0 || !buffer || size == 0 || user == 0) return 1;
    auto* stream = reinterpret_cast<FILE*>(user);
    const auto written = std::fwrite(buffer, 1, size, stream);
    if (stream == stdout) std::fflush(stream);
    return written == size ? 1 : 0;
}

static void CALLBACK progressCallback(LLONG, DWORD, DWORD, LDWORD) {}

static int fail(const char* message, int code = 1) {
    std::cerr << message << std::endl;
    return code;
}

int main(int argc, char** argv) {
    const auto args = parseArgs(argc, argv);
    Options options;
    options.host = args.count("--host") ? args.at("--host") : "";
    options.user = args.count("--user") ? args.at("--user") : "";
    options.password = args.count("--password") ? args.at("--password") : "";
    if (args.count("--password-stdin")) std::getline(std::cin, options.password);
    options.output = args.count("--output") ? args.at("--output") : "";
    options.start = args.count("--start") ? args.at("--start") : "";
    options.end = args.count("--end") ? args.at("--end") : "";
    if (args.count("--port")) options.port = std::atoi(args.at("--port").c_str());
    if (args.count("--channel")) options.channel = std::atoi(args.at("--channel").c_str());
    if (options.host.empty() || options.user.empty() || options.password.empty() || options.output.empty() || options.start.empty() || options.end.empty())
        return fail("Uso: securelog-recorder --host IP --port 37777 --user admin --password SENHA --channel 0 --start \"YYYY-MM-DD HH:mm:ss\" --end \"YYYY-MM-DD HH:mm:ss\" --output arquivo.dav");

    NET_TIME start{}, end{};
    if (!parseTime(options.start, start) || !parseTime(options.end, end)) return fail("Formato de data invalido; use YYYY-MM-DD HH:mm:ss");
    FILE* output = options.output == "-" ? stdout : nullptr;
    if (output == stdout) _setmode(_fileno(stdout), _O_BINARY);
    if (!output) output = std::fopen(options.output.c_str(), "wb");
    if (!output) return fail("Nao foi possivel criar o arquivo de saida");

    CLIENT_Init(disconnectCallback, 0);
    CLIENT_SetAutoReconnect(disconnectCallback, 0);
    NET_DEVICEINFO_Ex deviceInfo{};
    int error = 0;
    const LLONG login = CLIENT_LoginEx2(options.host.c_str(), static_cast<WORD>(options.port), options.user.c_str(), options.password.c_str(), EM_LOGIN_SPEC_CAP_TCP, nullptr, &deviceInfo, &error);
    if (login == 0) { CLIENT_Cleanup(); return fail("Falha no login NetSDK", error); }

    NET_IN_PLAY_BACK_BY_TIME_INFO input{};
    NET_OUT_PLAY_BACK_BY_TIME_INFO result{};
    input.stStartTime = start;
    input.stStopTime = end;
    input.cbDownLoadPos = progressCallback;
    input.fDownLoadDataCallBack = dataCallback;
    input.dwDataUser = reinterpret_cast<LDWORD>(output);
    input.nPlayDirection = 0;
    input.nWaittime = 10000;
    const LLONG playback = CLIENT_PlayBackByTimeEx2(login, options.channel, &input, &result);
    if (playback == 0) {
        CLIENT_Logout(login);
        CLIENT_Cleanup();
        return fail("Falha ao iniciar playback NetSDK");
    }

    const SYSTEMTIME now{};
    const int duration = (end.dwHour * 3600 + end.dwMinute * 60 + end.dwSecond) - (start.dwHour * 3600 + start.dwMinute * 60 + start.dwSecond);
    Sleep(static_cast<DWORD>((duration > 0 ? duration : 30) * 1000 + 3000));
    CLIENT_StopPlayBack(playback);
    if (output != stdout) std::fclose(output);
    CLIENT_Logout(login);
    CLIENT_Cleanup();
    return 0;
}
