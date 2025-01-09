import { action } from "@elgato/streamdeck";
import { MediaInfoAction, MediaInfo } from "./base"; // Import the base class

@action({ UUID: "com.daih.media-info.artist" })
export class ArtistAction extends MediaInfoAction<MediaInfo> {
    protected getInfoProperty(data: MediaInfo): string {
        return data.artist || "";
    }
}