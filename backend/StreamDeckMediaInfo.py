import socketio
import asyncio
from aiohttp import web
from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as MediaManager
from winrt.windows.storage.streams import DataReader, Buffer, InputStreamOptions
import io
import signal

sio = socketio.AsyncServer(async_mode="aiohttp", cors_allowed_origins="*")

async def get_media_info():
    sessions = await MediaManager.request_async()
    current_session = sessions.get_current_session()
    if current_session:
        info = await current_session.try_get_media_properties_async()
        info_dict = {song_attr: info.__getattribute__(song_attr) for song_attr in dir(info) if song_attr[0] != '_'}
        info_dict['genres'] = list(info_dict.get('genres', []))
        return info_dict
    return {}

async def read_stream_into_buffer(stream_ref, buffer):
    readable_stream = await stream_ref.open_read_async()
    await readable_stream.read_async(buffer, buffer.capacity, InputStreamOptions.READ_AHEAD)

async def media_info_api(request):
    try:
        current_media_info = await get_media_info()
        if 'thumbnail' in current_media_info:
            del current_media_info['thumbnail']
        return web.json_response(current_media_info)
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def thumbnail_api(request):
    try:
        current_media_info = await get_media_info()
        thumb_stream_ref = current_media_info.get('thumbnail')
        if thumb_stream_ref:
            thumb_read_buffer = Buffer(5000000)
            await read_stream_into_buffer(thumb_stream_ref, thumb_read_buffer)
            buffer_reader = DataReader.from_buffer(thumb_read_buffer)
            byte_buffer = bytearray(thumb_read_buffer.length)
            buffer_reader.read_bytes(byte_buffer)
            buffer_reader.detach_buffer()
            buffer_reader.close()
            return web.Response(body=byte_buffer, content_type='image/jpeg')
        else:
            return web.json_response({'error': 'No thumbnail available'}, status=404)
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def health_check(request):
    return web.Response(text="OK", status=200)

async def emit_media_updates():
    previous_title = ""
    while True:
        try:
            current_info = await get_media_info()
            if 'thumbnail' in current_info:
                del current_info['thumbnail']
            
            if current_info.get("title") != previous_title:
                previous_title = current_info.get("title")
                await sio.emit('media_update', current_info)
        except Exception as e:
            print(f"Error emitting media update: {e}")
        await asyncio.sleep(2)


async def main():
    print("Server started")
    app = web.Application()
    sio.attach(app)

    app.router.add_get('/media_info', media_info_api)
    app.router.add_get('/thumbnail', thumbnail_api)
    app.router.add_get('/health_check', health_check)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 27972)
    await site.start()

    update_task = asyncio.create_task(emit_media_updates())

    loop = asyncio.ProactorEventLoop()
    asyncio.set_event_loop(loop)

    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        pass

async def shutdown(runner, update_task):
    print("Shutting down...")
    update_task.cancel()
    await asyncio.gather(update_task, return_exceptions=True)
    print("Server stopped.")

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Exiting...")