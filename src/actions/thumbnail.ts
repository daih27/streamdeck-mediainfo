import { action, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import io from "socket.io-client";
import BackendManager from "./backend-manager";

@action({ UUID: "com.daih.media-info.thumbnail" })
export class ThumbnailAction extends SingletonAction<MediaInfoSettings> {
    private socket: SocketIOClient.Socket | null = null;
    private currentThumbnail: string | null = null;
    private backendURL = "http://localhost:27972";

    override async onWillAppear(ev: WillAppearEvent): Promise<void> {
        try {
            await BackendManager.getInstance().ensureBackendRunning();
            if (!this.socket) {
                this.socket = io(this.backendURL);
                this.socket.on("media_update", async () => {
                    await this.updateThumbnail(ev);
                });
            }
            await this.updateThumbnail(ev);
        } catch (error) {
            console.error("Failed to initialize WebSocket or fetch thumbnail:", error);
            await ev.action.setTitle("Error");
        }
    }

    override async onWillDisappear(ev: WillDisappearEvent): Promise<void> {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    private async updateThumbnail(ev: WillAppearEvent): Promise<void> {
        try {
            const response = await fetch(`${this.backendURL}/thumbnail`);
            if (!response.ok) {
                throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString("base64");
            const mimeType = response.headers.get("content-type") || "image/jpeg";
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            if (this.currentThumbnail !== dataUrl) {
                this.currentThumbnail = dataUrl;
                await ev.action.setImage(dataUrl);
                await ev.action.setTitle("");
            }
        } catch (error) {
            console.error("Failed to fetch and set thumbnail:", error);
            await ev.action.setTitle("No media");
        }
    }
}

type MediaInfoSettings = {};
