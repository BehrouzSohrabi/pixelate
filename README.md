# Pixel Art Resizer

## About This Project

This is a simple web-based tool designed to resize "upscaled" pixel art images back down to their original, smaller dimensions.

Often, pixel art is created at a small resolution (e.g., 32x32 pixels) and then scaled up *without anti-aliasing* for display purposes, resulting in each original pixel becoming a larger block of solid color (e.g., an 8x8 block, making the image 256x256).

This tool takes such an upscaled image, automatically detects (or lets you manually specify) the size of these blocks, and generates a correctly downscaled version where each block is represented by a single pixel (using the average color of the block).

## Features

*   **Upload Images:** Accepts PNG, JPEG, and WEBP image formats.
*   **Auto Block Size Detection:** Analyzes the image to determine the most likely block size used for upscaling.
*   **Manual Block Size Input:** Allows specifying the block size and optional X/Y padding if auto-detection fails or is incorrect.
*   **Pixel-Perfect Downscaling:** Calculates the average color of each block in the source image to create the corresponding pixel in the result image.
*   **Side-by-Side Comparison:** Displays the original uploaded image and the generated result.
*   **Result Information:** Shows detected/used block size, original/result dimensions, and padding used.
*   **Download Result:** Provides a button to download the downscaled image as a PNG file.
*   **Client-Side Processing:** All processing happens directly in your web browser using JavaScript and HTML5 Canvas. No images are uploaded to a server.