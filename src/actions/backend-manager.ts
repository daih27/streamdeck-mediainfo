import { spawn, ChildProcess } from "child_process";

class BackendManager {
    private static instance: BackendManager | null = null;
    private backendProcess: ChildProcess | null = null;
    private backendPath = "StreamDeckMediaInfo.exe";

    private constructor() {}

    static getInstance(): BackendManager {
        if (!BackendManager.instance) {
            BackendManager.instance = new BackendManager();
        }
        return BackendManager.instance;
    }

    async ensureBackendRunning(): Promise<void> {
        const isRunning = await this.isBackendRunning();

        if (isRunning) {
            console.log("Backend is already running.");
            return;
        }

        this.startBackend();
    }

    private async isBackendRunning(): Promise<boolean> {
        try {
            const response = await fetch(`http://localhost:27972/health_check`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    private startBackend(): void {
        if (this.backendProcess) {
            console.log("Backend process is already started.");
            return;
        }

        this.backendProcess = spawn(this.backendPath, [], {
            stdio: "inherit",
            detached: true,
        });

        this.backendProcess.on("error", (error) => {
            console.error("Failed to start backend:", error);
        });

        this.backendProcess.on("exit", (code) => {
            console.log(`Backend exited with code: ${code}`);
            this.backendProcess = null;
        });

        console.log("Backend started.");
    }

    stopBackend(): void {
        if (this.backendProcess) {
            this.backendProcess.kill();
            this.backendProcess = null;
            console.log("Backend stopped.");
        }
    }
}

export default BackendManager;
