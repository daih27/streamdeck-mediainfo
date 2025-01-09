import { action } from "@elgato/streamdeck";
import { MediaInfoAction, MediaInfo } from "./base"; // Import the base class

@action({ UUID: "com.daih.media-info.album" })
export class AlbumAction extends MediaInfoAction<MediaInfo> {
    protected getInfoProperty(data: MediaInfo): string {
        return data.album_title || "";
    }
}