/**
 * Helper function to generate asset paths with the correct BASE_URL
 * @param {string} filename - The filename within the assets directory
 * @returns {string} Full path to the asset
 */
export const getAssetPath = (filename) => `${import.meta.env.BASE_URL}assets/${filename}`;
