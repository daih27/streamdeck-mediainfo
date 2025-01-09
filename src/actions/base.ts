import { action, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import io from "socket.io-client";
import BackendManager from "./backend-manager";

export interface MediaInfo {
    title?: string;
    artist?: string;
    album_title?: string;
    error?: string;
}

export abstract class MediaInfoAction<T extends MediaInfo> extends SingletonAction<any> {
    private socket: SocketIOClient.Socket | null = null;
    protected text: string = "";
    protected title: string = "";
    protected artist: string = "";
    protected textOffset: number = 0;
    protected titleOffset: number = 0;
    protected artistOffset: number = 0;
    protected scrollSpeed: number = 2;
    protected visibleChars: number = 8;
    private intervalId: NodeJS.Timeout | null = null;
    private backendURL = "http://localhost:27972";
    protected displayBoth: boolean;

    constructor(displayBoth: boolean = false) {
        super();
        this.displayBoth = displayBoth;
    }


    protected abstract getInfoProperty(data: T): string;

    override async onWillAppear(ev: WillAppearEvent): Promise<void> {
        try {
            await BackendManager.getInstance().ensureBackendRunning();
            if (!this.socket) {
                this.socket = io(this.backendURL);
                this.socket.on("media_update", async () => {
                    await this.updateText(ev);
                });
            }
            await this.updateText(ev);
            this.startScrolling(ev);
        } catch (error) {
            console.error("Failed to initialize WebSocket or fetch media info:", error);
            await ev.action.setTitle("Error");
        }
    }

    override async onWillDisappear(ev: WillDisappearEvent): Promise<void> {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    protected async updateText(ev: any): Promise<void> {
        try {
            const response = await fetch(`${this.backendURL}/media_info`);
            const mediaInfo = await response.json() as T;
            if (mediaInfo.error) {
                console.error("Error from Server:", mediaInfo.error);
                await ev.action.setTitle("Error");
                return;
            }
            if (mediaInfo.artist === "" && mediaInfo.title === "" && mediaInfo.album_title === "") {
                this.text = "No media";
                this.title = "No media";
            } else {
                this.text = this.getInfoProperty(mediaInfo) || "";
                this.title = mediaInfo.title || "";
                this.artist = mediaInfo.artist || "";
            }
            this.updateDisplayedText(ev);
        } catch (error) {
            console.error("Failed to update media info:", error);
            await ev.action.setTitle("Error");
        }
    }

    private startScrolling(ev: WillAppearEvent): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => this.updateDisplayedText(ev), 1000);
    }

    protected async updateDisplayedText(ev: any): Promise<void> {
        if (this.displayBoth) {
            let displayedTitle = this.title;
            let displayedArtist = this.artist;

            if (this.title.length > this.visibleChars) {
                displayedTitle = this.title.substring(this.titleOffset, this.titleOffset + this.visibleChars);
                if (displayedTitle.length < this.visibleChars) {
                    displayedTitle += "    " + this.title.substring(0, this.visibleChars - displayedTitle.length);
                }
                this.titleOffset = (this.titleOffset + this.scrollSpeed) % this.title.length;
            } else {
                this.titleOffset = 0;
            }

            if (this.artist.length > this.visibleChars) {
                displayedArtist = this.artist.substring(this.artistOffset, this.artistOffset + this.visibleChars);
                if (displayedArtist.length < this.visibleChars) {
                    displayedArtist += "    " + this.artist.substring(0, this.visibleChars - displayedArtist.length);
                }
                this.artistOffset = (this.artistOffset + this.scrollSpeed) % this.artist.length;
            } else {
                this.artistOffset = 0;
            }
            var title = ""
            if (displayedArtist === "") {
                title = `${displayedTitle}`;
            } else {
                title = `${displayedTitle}\n\n${displayedArtist}`;
            }
            await ev.action.setTitle(title);
        } else {
            let displayedText = this.text;

            if (this.text.length > this.visibleChars) {
                displayedText = this.text.substring(this.textOffset, this.textOffset + this.visibleChars);
                if (displayedText.length < this.visibleChars) {
                    displayedText += "    " + this.text.substring(0, this.visibleChars - displayedText.length);
                }
                this.textOffset = (this.textOffset + this.scrollSpeed) % this.text.length;
            } else {
                this.textOffset = 0;
            }

            const title = `${displayedText}`;
            await ev.action.setTitle(title);
        }
    }
}