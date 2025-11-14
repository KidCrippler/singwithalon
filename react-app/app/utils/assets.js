/**
 * Helper function to generate asset paths with the correct BASE_URL
 * For Next.js, assets in /public are served from the root
 * @param {string} filename - The filename within the assets directory
 * @returns {string} Full path to the asset
 */
export const getAssetPath = (filename) => `/assets/${filename}`;
