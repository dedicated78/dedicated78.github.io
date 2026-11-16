import {Config} from '@remotion/cli/config';

// H.264 MP4, 1080x1920, 30 fps, AAC audio (fps/size/duration are set on the Composition).
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setAudioCodec('aac');
Config.setOverwriteOutput(true);
// ANGLE renders the 3D layers identically to swangle here and about 3x faster.
Config.setChromiumOpenGlRenderer('angle');
Config.setDelayRenderTimeoutInMilliseconds(120000);
