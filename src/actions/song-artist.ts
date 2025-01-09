import { action } from "@elgato/streamdeck";
import { MediaInfoAction, MediaInfo } from "./base";

@action({ UUID: "com.daih.media-info.song-artist" })
export class SongArtistAction extends MediaInfoAction<MediaInfo> {
    constructor() {
        super(true);
    }
    protected getInfoProperty(data: MediaInfo): string {
        return "";
    }
}