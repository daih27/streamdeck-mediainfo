import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { SongArtistAction } from "./actions/song-artist";
import { ThumbnailAction } from "./actions/thumbnail";
import { AlbumAction } from "./actions/album";
import { SongAction } from "./actions/song";
import { ArtistAction } from "./actions/artist";
import BackendManager from "./actions/backend-manager";

// Enable trace logging
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the actions
streamDeck.actions.registerAction(new SongArtistAction());
streamDeck.actions.registerAction(new ThumbnailAction());
streamDeck.actions.registerAction(new AlbumAction());
streamDeck.actions.registerAction(new SongAction());
streamDeck.actions.registerAction(new ArtistAction());

// Connect to the Stream Deck
streamDeck.connect().then(async () => {
    try {
        console.log("Stream Deck connected. Ensuring backend is running...");
        await BackendManager.getInstance().ensureBackendRunning();
    } catch (error) {
        console.error("Failed to start backend:", error);
    }
});

process.on("exit", () => {
    console.log("Process exiting. Stopping backend...");
    BackendManager.getInstance().stopBackend();
});
