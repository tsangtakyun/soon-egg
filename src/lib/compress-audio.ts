"use client";

export interface AudioCompressionProgress {
  ratio: number;
  message: string;
}

export interface AudioCompressionResult {
  file: File;
  compressed: boolean;
}

export function isWavFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return file.type === "audio/wav" || file.type === "audio/wave" || lowerName.endsWith(".wav");
}

export async function compressAudioForTranscription(
  file: File,
  onProgress?: (progress: AudioCompressionProgress) => void,
): Promise<AudioCompressionResult> {
  if (!isWavFile(file)) return { file, compressed: false };
  if (typeof window === "undefined") throw new Error("音訊壓縮只可以喺瀏覽器執行");

  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);
  const ffmpeg = new FFmpeg();
  const baseUrl = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.({
      ratio: Math.max(0, Math.min(1, progress || 0)),
      message: "正在壓縮 WAV",
    });
  });

  onProgress?.({ ratio: 0, message: "正在載入音訊處理器" });
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
  });

  onProgress?.({ ratio: 0.05, message: "正在讀取 WAV" });
  await ffmpeg.writeFile("input.wav", await fetchFile(file));
  await ffmpeg.exec([
    "-i", "input.wav",
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-b:a", "64k",
    "output.mp3",
  ]);

  const data = await ffmpeg.readFile("output.mp3");
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
  const output = new Uint8Array(bytes.byteLength);
  output.set(bytes);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const mp3 = new File([output.buffer], `${baseName}.mp3`, { type: "audio/mpeg" });
  onProgress?.({ ratio: 1, message: "音訊壓縮完成" });

  return { file: mp3, compressed: true };
}
