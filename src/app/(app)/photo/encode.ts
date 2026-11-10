const PHOTO_WIDTH = 1080;
const THUMB_WIDTH = 200;
const JPEG_QUALITY = 0.8;

function draw(source: CanvasImageSource, width: number, height: number, maxWidth: number, mirror: boolean) {
  const scale = Math.min(1, maxWidth / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas drawing isn't available");
  }
  context.imageSmoothingQuality = "high";
  if (mirror) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG encoding failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function photoForm(source: CanvasImageSource, width: number, height: number, mirror: boolean) {
  const photo = draw(source, width, height, PHOTO_WIDTH, mirror);
  const thumb = draw(photo, photo.width, photo.height, THUMB_WIDTH, false);
  const form = new FormData();
  form.append("photo", await toJpeg(photo), "photo.jpg");
  form.append("thumb", await toJpeg(thumb), "thumb.jpg");
  return form;
}

export async function fileForm(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await photoForm(image, image.naturalWidth, image.naturalHeight, false);
  } finally {
    URL.revokeObjectURL(url);
  }
}
