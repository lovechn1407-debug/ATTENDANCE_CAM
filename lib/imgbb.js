/**
 * ImgBB Image Upload Utility
 * API Key: 83e3f88941efd1059a89f016ff302d9e
 */

const IMGBB_API_KEY = "83e3f88941efd1059a89f016ff302d9e";
const IMGBB_UPLOAD_URL = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

/**
 * Upload a File, Blob, or Base64 string to ImgBB and return the image URL
 * @param {File | Blob | string} imageInput - Image File, Blob object, or base64 data string
 * @returns {Promise<{url: string, deleteUrl: string, displayUrl: string}>}
 */
export async function uploadToImgBB(imageInput) {
  try {
    const formData = new FormData();

    if (typeof imageInput === "string") {
      // Base64 string format: "data:image/jpeg;base64,..." -> extract pure base64
      const base64Data = imageInput.includes(",") 
        ? imageInput.split(",")[1] 
        : imageInput;
      formData.append("image", base64Data);
    } else if (imageInput instanceof File || imageInput instanceof Blob) {
      formData.append("image", imageInput);
    } else {
      throw new Error("Invalid image format provided for ImgBB upload");
    }

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      return {
        url: result.data.url,
        displayUrl: result.data.display_url,
        deleteUrl: result.data.delete_url,
        thumbUrl: result.data.thumb?.url || result.data.display_url
      };
    } else {
      throw new Error(result.error?.message || "Failed to upload image to ImgBB");
    }
  } catch (error) {
    console.error("ImgBB Upload Exception:", error);
    throw error;
  }
}
