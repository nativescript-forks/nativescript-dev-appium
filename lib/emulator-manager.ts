import { waitForOutput, resolve, log, isWin, shutdown, executeCommand } from "./utils";
import * as child_process from "child_process";
import { INsCapabilities } from "./ins-capabilities";

const ANDROID_HOME = process.env["ANDROID_HOME"];
const EMULATOR = resolve(ANDROID_HOME, "emulator", "emulator");
const ADB = resolve(ANDROID_HOME, "platform-tools", "adb");

export class EmulatorManager {
    private static _emulators: Map<string, EmulatorManager> = new Map();
    private static _emulatorIds: Map<string, string> = new Map();

    constructor(private _id, private _args, private _emulatorProc: child_process.ChildProcess, private _shouldKill) {
    }

    get id() {
        return this._id;
    }

    get emulatorProc() {
        return this._emulatorProc;
    }

    get args() {
        return this._args;
    }

    get shouldKill() {
        return this._shouldKill;
    }

    public static async startEmulator(args: INsCapabilities) {
        if (!args.appiumCaps.avd || args.appiumCaps.avd === "") {
            log("No avd name provided! We will not start the emulator!", args.verbose);
            return false;
        }

        if (EmulatorManager._emulatorIds.size === 0) {
            EmulatorManager.loadEmulatorsIds();
        }
        let id = EmulatorManager.emulatorId(args.appiumCaps.platformVersion) || "5554";

        const emulator = child_process.spawn(EMULATOR, ["-avd ", args.appiumCaps.avd, "-port ", id, args.emulatorOptions], {
            shell: true,
            detached: false
        });

        const responce: boolean = await waitForOutput(emulator, new RegExp(args.appiumCaps.avd, "i"), new RegExp("Error", "i"), args.appiumCaps.lt || 180000, args.verbose);
        if (responce === true) {
            EmulatorManager.waitUntilEmulatorBoot(id, args.appiumCaps.lt || 180000);
            EmulatorManager._emulators.set(args.runType, new EmulatorManager(id, args, emulator, true));
        } else {
            log("Emulator is probably already started!", args.verbose);
        }

        return responce
    }

    public static stop(args: INsCapabilities) {
        if (EmulatorManager._emulators.has(args.runType)) {

            const emu = EmulatorManager._emulators.get(args.runType);
            executeCommand(ADB + " -s emulator-" + emu.id + " emu kill");

            // return new Promise((resolve, reject) => {
            //     emu.emulatorProc.on("close", (code, signal) => {
            //         log(`Emulator terminated due signal: ${signal} and code: ${code}`, args.verbose);
            //         resolve();
            //     });

            //     emu.emulatorProc.on("exit", (code, signal) => {
            //         log(`Emulator terminated due signal: ${signal} and code: ${code}`, args.verbose);
            //         resolve();
            //     });

            //     emu.emulatorProc.on("error", (code, signal) => {
            //         log(`Emulator terminated due signal: ${signal} and code: ${code}`, args.verbose);
            //         resolve();
            //     });

            //     emu.emulatorProc.on("disconnect", (code, signal) => {
            //         log(`Emulator terminated due signal: ${signal} and code: ${code}`, args.verbose);
            //         resolve();
            //     });

            //     try {
            //         if (isWin) {
            //             shutdown(emu.emulatorProc, args.verbose);
            //         } else {
            //             executeCommand(ADB + " -s emulator-" + emu.id + " emu kill");
            //             shutdown(emu.emulatorProc, args.verbose);
            //             emu.emulatorProc.kill("SIGINT");
            //             //this._emulator.kill("SIGKILL");
            //         }
            //     } catch (error) {
            //         console.log(error);
            //     }
            // });
        }

    }

    private static waitUntilEmulatorBoot(deviceId, timeOut: number) {
        const startTime = new Date().getTime();
        let currentTime = new Date().getTime();
        let found = false;

        console.log("Booting emulator ...");

        while ((currentTime - startTime) < timeOut * 1000 && !found) {
            currentTime = new Date().getTime();
            found = this.checkIfEmulatorIsRunning("emulator-" + deviceId);
        }

        if (!found) {
            let error = deviceId + " failed to boot in " + timeOut + " seconds.";
            console.log(error, true);
        } else {
            console.log("Emilator is booted!");
        }
    }

    /**
     * 
     * @param deviceId 
     */
    private static checkIfEmulatorIsRunning(deviceId) {
        let isBooted = executeCommand(ADB + " -s " + deviceId + " shell getprop sys.boot_completed").trim() === "1";
        if (isBooted) {
            isBooted = executeCommand(ADB + " -s " + deviceId + " shell getprop init.svc.bootanim").toLowerCase().trim() === "stopped";
        }

        return isBooted;

        // let hasBooted = false;
        // let rowData = executeCommand(ADB + " -s " + deviceId + " shell dumpsys activity");
        // let list = rowData.split("\\r\\n");

        // list.forEach(line => {
        //     if (line.includes("Recent #0")
        //         && (line.includes("com.android.launcher")
        //             || line.includes("com.google.android.googlequicksearchbox")
        //             || line.includes("com.google.android.apps.nexuslauncher")
        //             || line.includes(deviceId))) {
        //         hasBooted = true;
        //     }
        // });

        // return hasBooted;
    }

    public static emulatorId(platformVersion) {
        return EmulatorManager._emulatorIds.get(platformVersion);
    }

    private static loadEmulatorsIds() {
        EmulatorManager._emulatorIds.set("4.2", "5554");
        EmulatorManager._emulatorIds.set("4.3", "5556");
        EmulatorManager._emulatorIds.set("4.4", "5558");
        EmulatorManager._emulatorIds.set("5.0", "5560");
        EmulatorManager._emulatorIds.set("6.0", "5562");
        EmulatorManager._emulatorIds.set("7.0", "5564");
        EmulatorManager._emulatorIds.set("7.1", "5566");
        EmulatorManager._emulatorIds.set("8.0", "5568");

    }
}