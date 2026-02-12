
/**
 * Crops an image based on the provided percentage coordinates.
 * @param imageUrl Source image URL (base64 or http)
 * @param rect Crop rectangle in percentages {x, y, w, h}
 * @returns Promise resolving to the cropped image as base64 string
 */
export async function cropImage(imageUrl: string, rect: { x: number, y: number, w: number, h: number }, rotation: number = 0): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("No 2D context"));
                return;
            }

            // Handle Rotation Logic - Map "Visual Rect" percentages to "Source Image" pixels
            // If rotation is 90, visual Top-Left corresponds to Source Top-Right (or similar depending on rotation direction).
            // We use simple coordinate mapping.

            const rad = (rotation * Math.PI) / 180;
            const sin = Math.abs(Math.sin(rad));
            const cos = Math.abs(Math.cos(rad));

            // "Visual" Dimensions (What the user sees as 100%)
            const visW = img.naturalWidth * cos + img.naturalHeight * sin;
            const visH = img.naturalWidth * sin + img.naturalHeight * cos;

            // Visual Crop Coordinates in Pixels
            const vx = (rect.x / 100) * visW;
            const vy = (rect.y / 100) * visH;
            const vw = (rect.w / 100) * visW;
            const vh = (rect.h / 100) * visH;

            // Desired Canvas Size (The cut out piece)
            canvas.width = vw;
            canvas.height = vh;

            // Strategy: Draw the source image onto the canvas such that the target crop area aligns with 0,0
            // and the image is rotated correctly.

            ctx.translate(-vx, -vy); // Move viewport to crop start

            // Rotate around the visual center? No, standard canvas rotation.
            // We need to place the image origin such that after rotation, it lands correctly.

            ctx.translate(vw / 2, vh / 2); // Center of CUT? No.

            // RESET: Simpler approach. Use an intermediate canvas for rotation if needed, or simple drawImage with transforms.
            // Let's use the Transform method:
            // 1. Reset context
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // 2. We want to see the region (vx, vy, vw, vh) of the ROTATED space.
            // So we translate so that (vx, vy) is at (0,0).
            ctx.translate(-vx, -vy);

            // 3. Now apply the rotation to the drawing of the image.
            // We need to rotate around the center of the visual space?
            // If we rotate the image 90deg, it pivots around 0,0.

            // Let's use a temporary canvas for correctness and simplicity (Browser handles optimized drawImage)
            if (rotation !== 0) {
                const tmp = document.createElement('canvas');
                tmp.width = visW;
                tmp.height = visH;
                const tctx = tmp.getContext('2d');
                if (tctx) {
                    tctx.translate(visW / 2, visH / 2);
                    tctx.rotate(rad);
                    tctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
                    // Now draw the slice from tmp
                    ctx.drawImage(tmp, vx, vy, vw, vh, 0, 0, vw, vh);
                }
            } else {
                const x = (rect.x / 100) * img.naturalWidth;
                const y = (rect.y / 100) * img.naturalHeight;
                const w = (rect.w / 100) * img.naturalWidth;
                const h = (rect.h / 100) * img.naturalHeight;
                ctx.drawImage(img, x, y, w, h, 0, 0, vw, vh);
            }

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => reject(new Error("Failed to load image for cropping"));
        img.src = imageUrl;
    });
}
